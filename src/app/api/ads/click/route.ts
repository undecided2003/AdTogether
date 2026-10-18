import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import { checkRateLimit, checkRateLimitCount } from '@/lib/rate-limit';
import { consumePublicAdRateLimit } from '@/lib/public-ad-rate-limit';
import { pruneDailyMap, pruneDailyMapByApp } from '@/lib/prune-daily-map';
import { verifyImpressionToken } from '@/lib/impression-token';
import { getTrustedRequestCountry, getTrustedRequestIp } from '@/lib/request-country';
import { findPublisherByAppId } from '@/lib/publisher-app-id';
import { getCachedApiSecret } from '@/lib/cached-secrets';
import { isBotTraffic } from '@/lib/bot-detection';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}

export async function POST(request: Request) {
  try {
    const reqHeaders = await headers();
    const trustedClientIp = getTrustedRequestIp(reqHeaders);
    
    // Zero-overhead bot screening: automated crawlers/scrapers must never record clicks
    if (isBotTraffic(reqHeaders.get('user-agent'), reqHeaders, trustedClientIp).isBot) {
      return NextResponse.json({ error: 'bot_traffic' }, { status: 403, headers: corsHeaders });
    }
    const originHeader = reqHeaders.get('origin') || reqHeaders.get('referer') || '';
    
    let body: any;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: corsHeaders });
    }
    const { adId, token, bundleId, environment, apiKey: legacyApiKey, appId: newAppId } = body;
    const explicitAppId = typeof newAppId === 'string' ? newAppId : '';
    const legacyAppId = typeof legacyApiKey === 'string' ? legacyApiKey : '';
    if (explicitAppId && legacyAppId && explicitAppId !== legacyAppId) {
      return NextResponse.json({ error: 'Conflicting App ID parameters' }, { status: 400, headers: corsHeaders });
    }
    const effectiveAppId = explicitAppId || legacyAppId;
    const normalizedBundleId = typeof bundleId === 'string' && bundleId.length <= 255 ? bundleId : '';

    // The request body is controlled by the caller.  It can opt out of
    // accounting only while the server is running locally or in tests.
    const serverAllowsTestTraffic =
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (serverAllowsTestTraffic && (environment === 'development' || environment === 'test')) {
      return NextResponse.json({ success: true, warning: 'ignored_test_traffic' }, { status: 200, headers: corsHeaders });
    }

    if (typeof adId !== 'string' || !adId || adId.length > 1_500) {
      return NextResponse.json({ error: 'adId is required' }, { status: 400, headers: corsHeaders });
    }
    
    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'Auth token is required' }, { status: 401, headers: corsHeaders });
    }

    if (!effectiveAppId) {
      return NextResponse.json({ error: 'App ID is required' }, { status: 401, headers: corsHeaders });
    }

    // Determine the source tracking ID
    let rawSource = normalizedBundleId;
    if (!rawSource && originHeader) {
      try {
        const urlObj = new URL(originHeader.startsWith('http') ? originHeader : `https://${originHeader}`);
        rawSource = urlObj.hostname;
      } catch (e) {
        rawSource = originHeader;
      }
    }
    const safeSourceId = (rawSource || 'unknown_origin').replace(/\./g, '_').replace(/\//g, '_').substring(0, 50);

    const API_SECRET_KEY = await getCachedApiSecret(db);

    if (!API_SECRET_KEY) {
      console.error('API_SECRET is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
    const impressionGrant = verifyImpressionToken(token, API_SECRET_KEY);
    if (
      !impressionGrant ||
      impressionGrant.adId !== adId ||
      impressionGrant.appId !== effectiveAppId
    ) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 403, headers: corsHeaders });
    }

    if (trustedClientIp) {
      // Match the durable bucket's scope so a shared client IP cannot make
      // one publisher's traffic throttle another publisher's application.
      const rateCheck = checkRateLimitCount(`click:${effectiveAppId}:${trustedClientIp}`, 100, 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
      }
      // Normal users click occasionally. Escalate to the durable Firestore limiter
      // only when repeated clicks from this IP are observed, saving rate-limit DB ops.
      if (rateCheck.count > 2) {
        try {
          if (!(await consumePublicAdRateLimit({
            scope: 'click',
            appId: effectiveAppId,
            clientIp: trustedClientIp,
            limit: 100,
            windowMs: 60 * 1000,
          }))) {
            return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
          }
        } catch (error) {
          console.error('Public ad click rate-limit error:', error);
          return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503, headers: corsHeaders });
        }
      }
    } else if (!checkRateLimit(`click:${effectiveAppId}:${safeSourceId}`, 100, 60 * 1000)) {
      // This local fallback is a loop guard only. It never treats
      // caller-reported source metadata as a trusted identity.
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }
    // Click geography is analytics only, but it must still come from the
    // signed grant rather than a body field or an arbitrary request header.
    const finalCountry = impressionGrant.country;
    const clickRequestCountry = getTrustedRequestCountry(reqHeaders);

    const adRef = db.collection('ads').doc(adId);
    await db.runTransaction(async (transaction: any) => {
      const adDoc = await transaction.get(adRef);
      if (!adDoc.exists) return;
      
      const adData = adDoc.data() || {};
      const ownerRef = typeof adData.ownerUid === 'string' && adData.ownerUid
        ? db.collection('users').doc(adData.ownerUid)
        : null;
      // Firestore transactions require every read before the first write.
      const ownerSnap = ownerRef ? await transaction.get(ownerRef) : null;
      
      const clicksByOrigin = adData.clicksByOrigin || {};
      clicksByOrigin[safeSourceId] = (clicksByOrigin[safeSourceId] || 0) + 1;
      
      const lastClickedMap = adData.lastClickedByOrigin || {};
      lastClickedMap[safeSourceId] = new Date().toISOString();
      
      const recentClicksMap = adData.recentClicksByOrigin || {};
      const currentClicks = recentClicksMap[safeSourceId] || [];
      currentClicks.push({
        time: new Date().toISOString(),
        region: finalCountry || 'Unknown',
        ...(clickRequestCountry && clickRequestCountry !== finalCountry
          ? { clickRequestCountry, countryMismatch: true }
          : {})
      });
      if (currentClicks.length > 40) {
        currentClicks.splice(0, currentClicks.length - 40);
      }
      recentClicksMap[safeSourceId] = currentClicks;

      transaction.update(adRef, { 
        clicks: (adData.clicks || 0) + 1,
        clicksByOrigin,
        lastClickedByOrigin: lastClickedMap,
        recentClicksByOrigin: recentClicksMap
      });

      // Track daily advertiser-side clicks on the ad owner's user doc.
      if (ownerRef && ownerSnap?.exists) {
          const ownerData = ownerSnap.data() || {};
          const dateKey = new Date().toISOString().split('T')[0];
          const dailyAdvertiserClicks = ownerData.dailyAdvertiserClicks || {};
          dailyAdvertiserClicks[dateKey] = (dailyAdvertiserClicks[dateKey] || 0) + 1;
          pruneDailyMap(dailyAdvertiserClicks);
          transaction.update(ownerRef, { dailyAdvertiserClicks });
      }
    });

    // Update publisher's earnings log with click count
    if (effectiveAppId) {
      const publisher = await findPublisherByAppId(db, effectiveAppId);
      if (publisher && publisher.id === impressionGrant.publisherUid) {
        const publisherRef = publisher.ref;
        // Fetch a fresh snapshot for the update; findPublisherByAppId returns an in-memory
        // cached snapshot whose stale earningsLog would overwrite real-time impressions.
        const pubDoc = await publisherRef.get();
        const pubData = pubDoc.data();
        if (pubData) {
          const earningsLog = pubData.earningsLog || {};
          const logKey = effectiveAppId ? `${effectiveAppId}_${adId}` : adId;
          const actualKey = earningsLog[logKey] ? logKey : (earningsLog[adId] ? adId : logKey);
          const dateKey = new Date().toISOString().split('T')[0];
          const appKey = effectiveAppId || 'unknown';

          // Always track daily clicks regardless of whether an earningsLog entry exists yet
          const dailyClicks = pubData.dailyClicks || {};
          dailyClicks[dateKey] = (dailyClicks[dateKey] || 0) + 1;
          pruneDailyMap(dailyClicks);
          const dailyClicksByApp = pubData.dailyClicksByApp || {};
          if (!dailyClicksByApp[appKey]) dailyClicksByApp[appKey] = {};
          dailyClicksByApp[appKey][dateKey] = (dailyClicksByApp[appKey][dateKey] || 0) + 1;
          pruneDailyMapByApp(dailyClicksByApp);

          // Also update the earnings log entry if it exists
          if (earningsLog[actualKey]) {
            const entry = earningsLog[actualKey];
            entry.clicks = (entry.clicks || 0) + 1;
            entry.appId = effectiveAppId || entry.appId || '';
            entry.lastUpdated = new Date().toISOString();
            if (actualKey !== logKey) {
              delete earningsLog[actualKey];
              earningsLog[logKey] = entry;
            }
            await publisherRef.update({ earningsLog, dailyClicks, dailyClicksByApp });
          } else {
            await publisherRef.update({ dailyClicks, dailyClicksByApp });
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error tracking click:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
