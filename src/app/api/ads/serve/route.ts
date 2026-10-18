import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import { checkRateLimit, checkRateLimitCount } from '@/lib/rate-limit';
import { consumePublicAdRateLimit } from '@/lib/public-ad-rate-limit';
import { createImpressionToken } from '@/lib/impression-token';
import { getTrustedRequestCountry, getTrustedRequestIp } from '@/lib/request-country';
import { getNativeAttestationAppConfig, type NativeAttestationAppConfig } from '@/lib/native-attestation';
import { findPublisherByAppId } from '@/lib/publisher-app-id';
import { getCachedActiveAds } from '@/lib/cached-active-ads';
import { getCachedApiSecret } from '@/lib/cached-secrets';
import { isBotTraffic } from '@/lib/bot-detection';
import { getStickyAdCacheKey, getStickyServedAd, setStickyServedAd } from '@/lib/sticky-ad-cache';
import { checkWebServeFrequencyLimit, recordWebServe } from '@/lib/web-frequency-limit';

export const runtime = 'nodejs';

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

export async function GET(request: Request) {
  try {
    const reqHeaders = await headers();
    const trustedClientIp = getTrustedRequestIp(reqHeaders);

    // Zero-overhead bot screening: known crawlers, headless/automation
    // engines, and scripted HTTP clients get an empty 204 before any
    // database work happens (0 DB operations for bot traffic).
    if (isBotTraffic(reqHeaders.get('user-agent'), reqHeaders, trustedClientIp).isBot) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const singletonParameters = [
      'adUnitId', 'appId', 'apiKey', 'adType', 'exclude', 'bundleId',
      'platform', 'sourceUrl', 'allowSelfAds',
    ];
    if (singletonParameters.some((name) => searchParams.getAll(name).length > 1)) {
      return NextResponse.json({ error: 'Duplicate query parameters are not allowed' }, { status: 400, headers: corsHeaders });
    }
    const trustedCountry = getTrustedRequestCountry(reqHeaders);
    const targetCountry = trustedCountry;
    const adUnitId = searchParams.get('adUnitId');
    const explicitAppId = searchParams.get('appId');
    const legacyApiKey = searchParams.get('apiKey');
    if (explicitAppId && legacyApiKey && explicitAppId !== legacyApiKey) {
      return NextResponse.json({ error: 'Conflicting App ID parameters' }, { status: 400, headers: corsHeaders });
    }
    const appId = explicitAppId || legacyApiKey;
    const adType = searchParams.get('adType') || 'banner';
    const exclude = searchParams.get('exclude'); // ID of the last shown ad
    const bundleId = searchParams.get('bundleId'); // Optional from mobile SDKs
    const platform = searchParams.get('platform');
    const explicitSourceUrl = searchParams.get('sourceUrl'); // Explicitly passed by SDK
    const allowSelfAdsParam = searchParams.get('allowSelfAds'); // 'true' or 'false'

    // Determine the source tracking ID for evaluating blocklist
    const originHeader = explicitSourceUrl || reqHeaders.get('origin') || reqHeaders.get('referer') || '';
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

    let viewerUid: string | null = null;
    let publisherBlockedAds: string[] = [];
    let publisherData: any = null;
    
    if (!appId) {
      return NextResponse.json({ error: 'App ID is required' }, { status: 400, headers: corsHeaders });
    }

    if (adType !== 'banner' && adType !== 'interstitial') {
      return NextResponse.json({ error: 'Invalid ad type' }, { status: 400, headers: corsHeaders });
    }

    const effectiveAppId = appId;
    
    // Zero-overhead Web Frequency Capping (Option B: In-Memory / Option C: Upstash Edge):
    // If this web client IP has exceeded the hourly (3) or daily (12) quota, reject before database queries.
    const isWeb = platform === 'web' || Boolean(reqHeaders.get('origin')) || (!bundleId && Boolean(reqHeaders.get('referer')));
    if (isWeb && trustedClientIp) {
      const webLimit = await checkWebServeFrequencyLimit(trustedClientIp);
      if (!webLimit.allowed) {
        return NextResponse.json(
          { error: 'Too Many Requests', message: 'Web frequency limit exceeded (max 3/hour, 12/day)' },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Retry-After': String(webLimit.retryAfterSeconds || 3600),
            },
          }
        );
      }
    }

    // Resolve current and legacy public App IDs. Ambiguous IDs are rejected.
    const userSnap = await findPublisherByAppId(db, effectiveAppId);

    if (userSnap) {
      viewerUid = userSnap.id;
      publisherData = userSnap.data();
      // Blocked ads are keyed by the specific App ID being used
      publisherBlockedAds = publisherData?.blockedAdsByAppId?.[effectiveAppId] || [];
    }

    if (!viewerUid) {
      return NextResponse.json({ error: 'Invalid App ID' }, { status: 401, headers: corsHeaders });
    }

    let rateCheckCount = 1;
    if (trustedClientIp) {
      // Keep the process-local fast path scoped exactly like the durable
      // bucket. A broad IP-only bucket would let traffic for one App ID
      // throttle unrelated apps behind a shared NAT.
      const rateCheck = checkRateLimitCount(`serve:${effectiveAppId}:${trustedClientIp}`, 60, 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
      }
      rateCheckCount = rateCheck.count;
    } else if (!checkRateLimit(`serve:${effectiveAppId}:${safeSourceId}`, 60, 60 * 1000)) {
      // This is only a local fallback for an unconfigured or unavailable
      // trusted ingress. Its caller-controlled source key is intentionally
      // never used as a fraud-control identity.
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    // Sticky Banner Serving: If this user/device recently requested a banner ad
    // (within the 15-second minimum banner persistence window), return the active ad
    // directly from memory. This completely stops high-frequency card-scanner/unmount loops
    // from churning tokens, evicting advertiser budgets, or hammering Firestore with rate-limit writes,
    // while ensuring real users are never blocked and see smooth, non-flickering ads.
    const stickyKey = adType === 'banner'
      ? getStickyAdCacheKey(effectiveAppId, trustedClientIp || safeSourceId, adUnitId, reqHeaders.get('user-agent'))
      : null;

    if (stickyKey) {
      const cachedAd = getStickyServedAd(stickyKey);
      if (cachedAd) {
        return NextResponse.json(cachedAd, { status: 200, headers: corsHeaders });
      }
    }

    // Escalate to durable Firestore limiter only for fresh ad generation when repeated traffic is observed
    if (trustedClientIp && rateCheckCount > 3) {
      try {
        if (!(await consumePublicAdRateLimit({
          scope: 'serve',
          appId: effectiveAppId,
          clientIp: trustedClientIp,
          limit: 60,
          windowMs: 60 * 1000,
        }))) {
          return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
        }
      } catch (error) {
        console.error('Public ad serve rate-limit error:', error);
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503, headers: corsHeaders });
      }
    }

    let nativeAttestationConfig: NativeAttestationAppConfig | null;
    try {
      nativeAttestationConfig = await getNativeAttestationAppConfig(db, effectiveAppId, viewerUid);
    } catch (error) {
      console.error('Native attestation configuration is invalid', error);
      return NextResponse.json({ error: 'Native attestation configuration is invalid' }, { status: 503, headers: corsHeaders });
    }
    if (nativeAttestationConfig) {
      if (bundleId && bundleId !== nativeAttestationConfig.bundleId) {
        return NextResponse.json({ error: 'Registered app identifier mismatch' }, { status: 403, headers: corsHeaders });
      }
      if (nativeAttestationConfig.provider === 'play-integrity' && platform && platform !== 'android') {
        return NextResponse.json({ error: 'This App ID is configured for Android attestation' }, { status: 403, headers: corsHeaders });
      }
      if (nativeAttestationConfig.provider === 'app-attest' && platform && platform !== 'ios') {
        return NextResponse.json({ error: 'This App ID is configured for Apple App Attest' }, { status: 403, headers: corsHeaders });
      }
    }

    const externalAds: any[] = [];
    const selfAds: any[] = [];
    
    try {
      // 1. Fetch active ads (cached for 60s in-memory to prevent millions of redundant reads)
      const activeAds = await getCachedActiveAds(db);
      
      activeAds.forEach((doc) => {
        const data = doc.data;
        
        // Filter strictly by ad type
        const adDataType = data.adType || 'banner';
        if (adDataType !== adType) {
          return;
        }

        // Skip ads that have blocked this origin
        if (data.blockedOrigins && data.blockedOrigins.includes(safeSourceId)) {
          return;
        }

        // Skip ads that the publisher has blocked for this App ID
        if (publisherBlockedAds.length > 0 && publisherBlockedAds.includes(doc.id)) {
          return;
        }

        const adTargetCountries = data.targetCountries 
          ? (Array.isArray(data.targetCountries) ? data.targetCountries : [data.targetCountries]) 
          : (data.targetCountry && data.targetCountry !== 'global' ? [data.targetCountry] : []);
          
        const isGlobalAd = 
          adTargetCountries.length === 0 || 
          adTargetCountries.includes('global') ||
          adTargetCountries.length >= 190;

        if (isGlobalAd || (targetCountry && adTargetCountries.includes(targetCountry))) {
          // Check if it's a "self ad"
          // Criteria: owned by viewer OR destination matches source
          let isSelfAd = false;
          
          if (viewerUid && data.ownerUid === viewerUid) {
            isSelfAd = true;
          } else if (data.clickUrl && rawSource && rawSource !== 'unknown_origin') {
            try {
              const clickUrlObj = new URL(data.clickUrl);
              const clickHostname = clickUrlObj.hostname.toLowerCase();
              const sourceHostname = rawSource.toLowerCase();
              
              // Robust domain match: identical OR one is a subdomain of the other
              if (
                clickHostname === sourceHostname || 
                clickHostname.endsWith('.' + sourceHostname) || 
                sourceHostname.endsWith('.' + clickHostname)
              ) {
                isSelfAd = true;
              }
            } catch (e) {
              // Ignore URL parse errors
            }
          }

          if (isSelfAd) {
            selfAds.push({ id: doc.id, ...data, isSelfAd: true });
          } else {
            externalAds.push({ id: doc.id, ...data, isSelfAd: false });
          }
        }
      });
    } catch (dbError) {
      console.error('Database fetch failed:', dbError);
    }

    // 2. Selection Logic
    // Combine external ads and self-ads in the rotation pool if allowSelfAds is not false
    let candidates = allowSelfAdsParam === 'false'
      ? externalAds
      : [...externalAds, ...selfAds];

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No ads available' }, { status: 404, headers: corsHeaders });
    }

    // Select an ad, avoiding the 'exclude' one if possible
    let filteredCandidates = candidates;
    if (exclude && candidates.length > 1) {
      filteredCandidates = candidates.filter(ad => ad.id !== exclude);
    }
    
    const randomAd = filteredCandidates[Math.floor(Math.random() * filteredCandidates.length)];

    // 3. Create auth token for impressions/clicks
    const API_SECRET_KEY = await getCachedApiSecret(db);

    if (!API_SECRET_KEY) {
      console.error('API_SECRET is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
    const token = createImpressionToken({
      adId: randomAd.id,
      appId: effectiveAppId,
      publisherUid: viewerUid,
      adType: randomAd.adType || 'banner',
      // A missing Origin or Referer is not proof of native traffic.  Only a
      // grant that requires a server-verified native proof may skip web
      // viewability telemetry.
      requiresWebViewability: nativeAttestationConfig === null,
      country: trustedCountry,
      nativeAttestation: nativeAttestationConfig?.provider || null,
      nativeAppId: nativeAttestationConfig?.bundleId || null,
      nativeAppIdPrefix: nativeAttestationConfig?.provider === 'app-attest' ? nativeAttestationConfig.appIdPrefix || null : null,
      nativeAttestationEnvironment: nativeAttestationConfig?.provider === 'app-attest'
        ? nativeAttestationConfig.environment || 'production'
        : null,
    }, API_SECRET_KEY);

    // 4. Return the selected ad
    const responsePayload = {
      id: randomAd.id,
      title: randomAd.title,
      description: randomAd.description,
      imageUrl: randomAd.imageUrl,
      clickUrl: randomAd.clickUrl,
      token,
      adType: randomAd.adType || 'banner',
      nativeAttestation: nativeAttestationConfig?.provider || null,
      ...(nativeAttestationConfig?.provider === 'play-integrity'
        ? { playIntegrityProjectNumber: nativeAttestationConfig.playIntegrityProjectNumber }
        : {}),
    };

    if (stickyKey && (randomAd.adType || 'banner') === 'banner') {
      setStickyServedAd(stickyKey, responsePayload, token, 15_000);
    }

    if (isWeb && trustedClientIp) {
      await recordWebServe(trustedClientIp);
    }

    return NextResponse.json(responsePayload, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error serving ad:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
