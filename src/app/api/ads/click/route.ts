import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db, FieldValue } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';
    
    const ipCountry = reqHeaders.get('x-vercel-ip-country') 
      || reqHeaders.get('x-appengine-country')
      || reqHeaders.get('x-country-code')
      || reqHeaders.get('x-client-geo-country')
      || reqHeaders.get('cf-ipcountry')         // Cloudflare
      || reqHeaders.get('x-country')
      || null;
    
    // Extract origin for web tracking
    const originHeader = reqHeaders.get('origin') || reqHeaders.get('referer') || '';
    
    if (!checkRateLimit(ip, 100, 60 * 1000)) { // 100 requests per minute
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    const body = await request.json();
    const { adId, token, bundleId, environment, country, apiKey: legacyApiKey, appId: newAppId } = body;
    const effectiveAppId = newAppId || appId || legacyApiKey;
    const finalCountry = country || ipCountry;

    // Ignore local test traffic
    if (environment === 'development' || environment === 'test') {
      return NextResponse.json({ success: true, warning: 'ignored_test_traffic' }, { status: 200, headers: corsHeaders });
    }

    if (!adId) {
      return NextResponse.json({ error: 'adId is required' }, { status: 400, headers: corsHeaders });
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Auth token is required' }, { status: 401, headers: corsHeaders });
    }

    // Determine the source tracking ID
    let rawSource = bundleId;
    if (!rawSource && originHeader) {
      try {
        const urlObj = new URL(originHeader.startsWith('http') ? originHeader : `https://${originHeader}`);
        rawSource = urlObj.hostname;
      } catch (e) {
        rawSource = originHeader;
      }
    }
    const safeSourceId = (rawSource || 'unknown_origin').replace(/\./g, '_').replace(/\//g, '_').substring(0, 50);

    const configSnap = await db.collection('config').doc('secrets').get();
    const secretsData = configSnap.data() || {};
    const API_SECRET_KEY = secretsData.API_SECRET || process.env.API_SECRET;

    if (!API_SECRET_KEY) {
      console.error('API_SECRET is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
    const hmac = crypto.createHmac('sha256', API_SECRET_KEY);
    hmac.update(adId);
    const expectedToken = hmac.digest('hex');

    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 403, headers: corsHeaders });
    }

    const adRef = db.collection('ads').doc(adId);
    await db.runTransaction(async (transaction: any) => {
      const adDoc = await transaction.get(adRef);
      if (!adDoc.exists) return;
      
      const adData = adDoc.data() || {};
      
      const clicksByOrigin = adData.clicksByOrigin || {};
      clicksByOrigin[safeSourceId] = (clicksByOrigin[safeSourceId] || 0) + 1;
      
      const lastClickedMap = adData.lastClickedByOrigin || {};
      lastClickedMap[safeSourceId] = new Date().toISOString();
      
      const recentClicksMap = adData.recentClicksByOrigin || {};
      const currentClicks = recentClicksMap[safeSourceId] || [];
      currentClicks.push({
        time: new Date().toISOString(),
        region: finalCountry || 'Unknown'
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
    }).catch(console.error);

    // Update publisher's earnings log with click count
    if (effectiveAppId) {
      let publisherRef: any = null;
      
      // 1. Try appId field
      const pSnapAppId = await db.collection('users').where('appId', '==', effectiveAppId).limit(1).get();
      if (!pSnapAppId.empty) {
        publisherRef = pSnapAppId.docs[0].ref;
      } else {
        // 2. Try appIds array
        const pSnapAppIds = await db.collection('users').where('appIds', 'array-contains', effectiveAppId).limit(1).get();
        if (!pSnapAppIds.empty) {
          publisherRef = pSnapAppIds.docs[0].ref;
        } else {
          // 3. Fallback to legacy apiKey field
          const pSnapApiKey = await db.collection('users').where('apiKey', '==', effectiveAppId).limit(1).get();
          if (!pSnapApiKey.empty) {
            publisherRef = pSnapApiKey.docs[0].ref;
          } else {
            // 4. Fallback to legacy apiKeys array
            const pSnapApiKeys = await db.collection('users').where('apiKeys', 'array-contains', effectiveAppId).limit(1).get();
            if (!pSnapApiKeys.empty) {
              publisherRef = pSnapApiKeys.docs[0].ref;
            }
          }
        }
      }

      if (publisherRef) {
        const pubDoc = await publisherRef.get();
        const pubData = pubDoc.data();
        if (pubData) {
          const earningsLog = pubData.earningsLog || {};
          const logKey = effectiveAppId ? `${effectiveAppId}_${adId}` : adId;
          const actualKey = earningsLog[logKey] ? logKey : (earningsLog[adId] ? adId : logKey);
          
          if (earningsLog[actualKey]) {
            earningsLog[actualKey].clicks = (earningsLog[actualKey].clicks || 0) + 1;
            earningsLog[actualKey].appId = effectiveAppId || earningsLog[actualKey].appId || '';
            earningsLog[actualKey].lastUpdated = new Date().toISOString();
            await publisherRef.update({ earningsLog });
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
