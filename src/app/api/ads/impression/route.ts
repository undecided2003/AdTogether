import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import { checkRateLimit, checkRateLimitCount } from '@/lib/rate-limit';
import { consumePublicAdRateLimit } from '@/lib/public-ad-rate-limit';
import { getCountryTier, getTierMultiplier } from '@/lib/country-tiers';
import { sendResendEmail } from '@/lib/resend';
import { pruneDailyMap, pruneDailyMapByApp } from '@/lib/prune-daily-map';
import { CREDIT_AUTO_PAUSE_REASON, CREDIT_AUTO_RESUME_THRESHOLD, MANUAL_PAUSE_FIELD } from '@/lib/credit-policy';
import { verifyImpressionToken } from '@/lib/impression-token';
import { getTrustedRequestCountry, getTrustedRequestIp } from '@/lib/request-country';
import {
  impressionRequestHash,
  verifyAppleAppAssertion,
  verifyPlayIntegrityToken,
  type VerifiedAppAttestAssertion,
} from '@/lib/native-attestation';
import { getCachedApiSecret, getCachedSecrets } from '@/lib/cached-secrets';
import { isBotTraffic } from '@/lib/bot-detection';
import { invalidateActiveAdsCache } from '@/lib/cached-active-ads';
import { invalidateStickyAdByToken } from '@/lib/sticky-ad-cache';
import { checkWebImpressionFrequencyLimit, recordWebImpression, webFrequencySubject } from '@/lib/web-frequency-limit';
import { INTEGRATION_BLOCKED_RESPONSE, isIntegrationBlocked } from '@/lib/integration-blocklist';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const MAX_AUTO_RESUMED_CAMPAIGNS_PER_IMPRESSION = 450;
const MIN_WEB_VIEWABLE_PERCENT = 50;
const MIN_WEB_VIEWABLE_DURATION_MS = 1000;
const MIN_SERVER_IMPRESSION_AGE_MS = 1000;
const CLIENT_DURATION_CLOCK_TOLERANCE_MS = 1500;

function normalizePagePath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return undefined;

  const input = value.trim();
  let pathname: string;
  if (/^https?:\/\//i.test(input)) {
    try {
      pathname = new URL(input).pathname;
    } catch {
      return undefined;
    }
  } else {
    pathname = input.split(/[?#]/, 1)[0];
  }

  if (!pathname.startsWith('/')) return undefined;
  const safePath = pathname.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 300);
  return safePath || '/';
}

function publisherHasAppId(userData: any, appId: string): boolean {
  return userData?.appId === appId ||
    userData?.apiKey === appId ||
    (Array.isArray(userData?.appIds) && userData.appIds.includes(appId)) ||
    (Array.isArray(userData?.apiKeys) && userData.apiKeys.includes(appId));
}

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

    // Zero-overhead bot screening: bots get a benign, uncredited response
    // before the body is parsed or any database work happens
    // (0 DB operations for bot traffic).
    if (isBotTraffic(reqHeaders.get('user-agent'), reqHeaders, trustedClientIp).isBot) {
      return NextResponse.json(
        { success: true, credited: false, reason: 'bot_traffic' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Extract origin for web tracking
    const originHeader = reqHeaders.get('origin') || reqHeaders.get('referer') || '';
    const refererHeader = reqHeaders.get('referer') || '';
    
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
    const {
      adId,
      token,
      appId,
      apiKey,
      bundleId,
      platform,
      appName,
      environment,
      pagePath: rawPagePath,
      visiblePercent: rawVisiblePercent,
      visibleDurationMs: rawVisibleDurationMs,
      playIntegrityToken,
      appAttestKeyId,
      appAttestAssertion,
    } = body as Record<string, unknown>;
    const explicitAppId = typeof appId === 'string' ? appId : '';
    const legacyAppId = typeof apiKey === 'string' ? apiKey : '';
    if (explicitAppId && legacyAppId && explicitAppId !== legacyAppId) {
      return NextResponse.json({ error: 'Conflicting App ID parameters' }, { status: 400, headers: corsHeaders });
    }
    const effectiveAppId = explicitAppId || legacyAppId;
    // Temporary integration blocklist (in-flight impressions from a blocked
    // integration must not credit; see src/lib/integration-blocklist.ts).
    if (isIntegrationBlocked(effectiveAppId)) {
      return NextResponse.json(INTEGRATION_BLOCKED_RESPONSE.body, {
        status: INTEGRATION_BLOCKED_RESPONSE.status,
        headers: corsHeaders,
      });
    }
    // View-frequency subject (App ID + IP + UA fingerprint): each device behind
    // a shared carrier-grade NAT keeps its own 3/hr, 12/day quota. The durable
    // IP-keyed fraud limiters below are unchanged by this subject.
    const freqSubject = webFrequencySubject(trustedClientIp, effectiveAppId, reqHeaders.get('user-agent'));
    const normalizedBundleId = typeof bundleId === 'string' && bundleId.length <= 255 ? bundleId : '';
    const normalizedPlatform = typeof platform === 'string' && platform.length <= 64 ? platform : '';
    const normalizedAppName = typeof appName === 'string' && appName.length <= 255 ? appName : '';
    const pagePath = normalizePagePath(rawPagePath) || normalizePagePath(refererHeader);
    const clientReportsWeb =
      normalizedPlatform.toLowerCase() === 'web' ||
      Boolean(reqHeaders.get('origin'));
    const visiblePercent = Number(rawVisiblePercent);
    const visibleDurationMs = Number(rawVisibleDurationMs);
    
    // A client can name any environment, so it can only opt out of
    // accounting while this server is itself running locally or in tests.
    // Deployed Next.js applications set NODE_ENV to production.
    const serverAllowsTestTraffic =
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (serverAllowsTestTraffic && (environment === 'development' || environment === 'test')) {
      return NextResponse.json({ success: true, warning: 'ignored_test_traffic' }, { status: 200, headers: corsHeaders });
    }
    
    const outOfCreditsEmailMonth = new Date().toISOString().slice(0, 7);

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

    let rateCheckCount = 1;
    if (trustedClientIp) {
      // Scope this in-process fast path to the endpoint and App ID as well
      // as the verified client IP. The Firestore limiter is deferred until
      // after viewability and dwell-time checks pass to avoid DB operations for failed traffic.
      const rateCheck = checkRateLimitCount(`impression:${effectiveAppId}:${trustedClientIp}`, 200, 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
      }
      rateCheckCount = rateCheck.count;
    } else if (!checkRateLimit(`impression:${effectiveAppId}:${safeSourceId}`, 200, 60 * 1000)) {
      // Keep a bounded local loop guard when an ingress identity is missing.
      // The source is caller-reported, so it is not a security boundary.
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    const nativeAttestationProvider = impressionGrant.nativeAttestation || null;
    let verifiedAppAttestAssertion: VerifiedAppAttestAssertion | null = null;
    if (nativeAttestationProvider === 'play-integrity') {
      if (!impressionGrant.nativeAppId ||
          !(await verifyPlayIntegrityToken({
            integrityToken: playIntegrityToken,
            packageName: impressionGrant.nativeAppId,
            expectedRequestHash: impressionRequestHash(token),
            environment: impressionGrant.nativeAttestationEnvironment,
          }))) {
        return NextResponse.json({ error: 'Native app integrity verification failed' }, { status: 403, headers: corsHeaders });
      }
    } else if (nativeAttestationProvider === 'app-attest') {
      if (!impressionGrant.nativeAppId || !impressionGrant.nativeAppIdPrefix ||
          !impressionGrant.nativeAttestationEnvironment) {
        return NextResponse.json({ error: 'Native app attestation configuration is invalid' }, { status: 403, headers: corsHeaders });
      }
      verifiedAppAttestAssertion = await verifyAppleAppAssertion({
        db,
        keyId: appAttestKeyId,
        assertion: appAttestAssertion,
        grantToken: token,
        appId: effectiveAppId,
        publisherUid: impressionGrant.publisherUid,
        expectedBundleId: impressionGrant.nativeAppId,
        expectedAppIdPrefix: impressionGrant.nativeAppIdPrefix,
        expectedEnvironment: impressionGrant.nativeAttestationEnvironment,
      });
      if (!verifiedAppAttestAssertion) {
        return NextResponse.json({ error: 'Native app integrity verification failed' }, { status: 403, headers: corsHeaders });
      }
    }

    const isWebImpression = impressionGrant.requiresWebViewability || clientReportsWeb;
    const serverMeasuredAgeMs = Date.now() - impressionGrant.issuedAtMs;
    // Native attestation establishes a genuine app instance, but it does not
    // establish that the ad was presented for any amount of time. Require the
    // same server-measured dwell time for every grant so an attested client
    // cannot turn a freshly served grant directly into a credited impression.
    const isDwellTimeViolation = serverMeasuredAgeMs < MIN_SERVER_IMPRESSION_AGE_MS;

    // Price from the signed country observed by the edge when it served the ad.
    const finalCountry = impressionGrant.country;
    const impressionRequestCountry = getTrustedRequestCountry(reqHeaders);
    const countryMismatch = Boolean(
      finalCountry && impressionRequestCountry && finalCountry !== impressionRequestCountry
    );
    const tier = getCountryTier(finalCountry);
    const tierMultiplier = getTierMultiplier(tier);

    // Client telemetry can screen out impossible reports, but it cannot prove DOM visibility.
    const rawContainerWidth = (body as any)?.containerWidth ?? (body as any)?.width;
    const rawContainerHeight = (body as any)?.containerHeight ?? (body as any)?.height;
    const containerWidth = typeof rawContainerWidth === 'number' ? rawContainerWidth : (typeof rawContainerWidth === 'string' && rawContainerWidth ? Number(rawContainerWidth) : null);
    const containerHeight = typeof rawContainerHeight === 'number' ? rawContainerHeight : (typeof rawContainerHeight === 'string' && rawContainerHeight ? Number(rawContainerHeight) : null);

    // Micro-container / invisible placement guard: ads smaller than 30px x 15px are physically unreadable
    const isDimensionViolation =
      isWebImpression &&
      ((containerWidth !== null && Number.isFinite(containerWidth) && containerWidth < 30) ||
       (containerHeight !== null && Number.isFinite(containerHeight) && containerHeight < 15));

    const isViewabilityViolation =
      isDimensionViolation ||
      (isWebImpression &&
        (!Number.isFinite(visiblePercent) ||
          visiblePercent < MIN_WEB_VIEWABLE_PERCENT ||
          visiblePercent > 100 ||
          !Number.isFinite(visibleDurationMs) ||
          visibleDurationMs < MIN_WEB_VIEWABLE_DURATION_MS ||
          visibleDurationMs > serverMeasuredAgeMs + CLIENT_DURATION_CLOCK_TOLERANCE_MS));

    // Zero-overhead guard: Sub-second dwell time or invalid viewability reports
    // are rejected immediately in-memory without initiating a costly Firestore transaction
    // or writing an uncredited grant. This prevents high-frequency scanner/unmount loops
    // from consuming database operations while keeping genuine 1s+ views creditable.
    if (isDwellTimeViolation) {
      return NextResponse.json(
        { success: true, credited: false, reason: 'server_minimum_view_time_not_met' },
        { status: 200, headers: corsHeaders }
      );
    }

    if (isViewabilityViolation) {
      return NextResponse.json(
        {
          success: true,
          credited: false,
          reason: isDimensionViolation ? 'invalid_container_dimensions' : 'viewability_threshold_not_met',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Zero-overhead Web Frequency Capping (Option B: In-Memory / Option C: Upstash Edge):
    // Reject excessive views per IP (3/hour, 12/day) before initiating the Firestore transaction (0 DB reads).
    if (isWebImpression && trustedClientIp) {
      const webLimit = await checkWebImpressionFrequencyLimit(freqSubject);
      if (!webLimit.allowed) {
        return NextResponse.json(
          { success: true, credited: false, reason: webLimit.reason },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Normal visitors make 1-3 impression requests/min. Escalate to the durable Firestore limiter
    // only when verified, viewable impressions are observed, saving ~95% of rate-limit DB ops.
    if (trustedClientIp && rateCheckCount > 3) {
      try {
        if (!(await consumePublicAdRateLimit({
          scope: 'impression',
          appId: effectiveAppId,
          clientIp: trustedClientIp,
          limit: 200,
          windowMs: 60 * 1000,
        }))) {
          return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
        }
      } catch (error) {
        console.error('Public ad impression rate-limit error:', error);
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503, headers: corsHeaders });
      }
    }

    const publisherRef = db.collection('users').doc(impressionGrant.publisherUid);

    const adRef = db.collection('ads').doc(adId);
    const impressionGrantRef = db.collection('impressionGrants').doc(impressionGrant.nonce);
    const appAttestKeyRef = verifiedAppAttestAssertion
      ? db.collection('appAttestKeys').doc(verifiedAppAttestAssertion.keyDocumentId)
      : null;
    let outOfCredits = false;
    let duplicateImpression = false;
    let consumedGrantData: any = null;
    let isSelfImpressionResult = false;
    let invalidPublisher = false;
    let grantAdTypeMismatch = false;
    let inactiveCampaign = false;
    let invalidNativeAttestation = false;
    let appAttestKeyMissing = false;
    let appAttestOutOfOrder = false;
    let sendCreditNotification = false;
    let creditNotificationType: 'low' | 'out_of_credits' | null = null;
    let creditNotificationEmail: string | null = null;
    let didResumeCampaigns = false;

    // Use runTransaction to safely process impression and deduct/add credits
    await db.runTransaction(async (transaction: any) => {
      // Firestore may retry this callback after a conflict, so keep side-effect
      // decisions scoped to the transaction attempt that ultimately commits.
      outOfCredits = false;
      didResumeCampaigns = false;
      duplicateImpression = false;
      consumedGrantData = null;
      isSelfImpressionResult = false;
      invalidPublisher = false;
      grantAdTypeMismatch = false;
      inactiveCampaign = false;
      invalidNativeAttestation = false;
      appAttestKeyMissing = false;
      appAttestOutOfOrder = false;
      sendCreditNotification = false;
      creditNotificationType = null;
      creditNotificationEmail = null;

      // 1. ALL READS FIRST
      const consumedGrantSnap = await transaction.get(impressionGrantRef);
      if (consumedGrantSnap.exists) {
        duplicateImpression = true;
        consumedGrantData = consumedGrantSnap.data() || null;
        return;
      }

      let appAttestKeySnap: any = null;
      if (appAttestKeyRef && verifiedAppAttestAssertion) {
        appAttestKeySnap = await transaction.get(appAttestKeyRef);
        const keyData = appAttestKeySnap.data();
        if (!appAttestKeySnap.exists) {
          appAttestKeyMissing = true;
          return;
        }
        if (
          keyData?.appId !== effectiveAppId ||
          keyData?.publisherUid !== impressionGrant.publisherUid ||
          keyData?.bundleId !== impressionGrant.nativeAppId ||
          keyData?.appIdPrefix !== impressionGrant.nativeAppIdPrefix ||
          keyData?.environment !== impressionGrant.nativeAttestationEnvironment ||
          !Number.isSafeInteger(keyData?.signCount)
        ) {
          invalidNativeAttestation = true;
          return;
        }
        if (verifiedAppAttestAssertion.signCount <= keyData.signCount) {
          appAttestOutOfOrder = true;
          return;
        }
      }

      const adSnap = await transaction.get(adRef);
      if (!adSnap.exists) {
        throw new Error('Ad not found');
      }

      const adData = adSnap.data();
      if (!adData) throw new Error('Ad data missing');
      if (adData.active !== true) {
        // A grant can outlive a manual pause or an automatic credit pause.
        // Consume the grant so it cannot be banked and replayed after reactivation.
        transaction.set(impressionGrantRef, {
          adId,
          appId: effectiveAppId,
          publisherUid: impressionGrant.publisherUid,
          adType: adData.adType || 'banner',
          consumedAt: new Date(),
          expiresAt: new Date(impressionGrant.expiresAtMs),
          credited: false,
          isSelfImpression: false,
          reason: 'campaign_inactive',
        });
        inactiveCampaign = true;
        return;
      }
      
      const ownerUid = adData.ownerUid;
      const adType = adData.adType || 'banner';
      
      const baseCost = adType === 'interstitial' ? 5 : 1;
      const creditCost = baseCost * tierMultiplier;

      let userSnap = null;
      let userRef = null;
      if (ownerUid) {
        userRef = db.collection('users').doc(ownerUid);
        userSnap = await transaction.get(userRef);
      }

      let pSnap: any = null;
      if (publisherRef) {
        // Optimization A: When a publisher serves their own ad (self-ad),
        // userRef and publisherRef point to the identical document (users/{ownerUid}).
        // Reusing userSnap eliminates a redundant Firestore read within the transaction.
        if (ownerUid && userRef && publisherRef.id === ownerUid && userSnap) {
          pSnap = userSnap;
        } else {
          pSnap = await transaction.get(publisherRef);
        }
      }

      if (!pSnap?.exists || !publisherHasAppId(pSnap.data(), effectiveAppId)) {
        invalidPublisher = true;
        return;
      }

      if (adType !== impressionGrant.adType) {
        grantAdTypeMismatch = true;
        return;
      }

      // 2. Determine if this is a self-impression
      let isSelfImpression = false;
      
      // Check if publisher is the owner
      if (ownerUid && pSnap?.exists && pSnap.id === ownerUid) {
        isSelfImpression = true;
      } 
      // Check if destination matches source
      else if (adData.clickUrl && rawSource && rawSource !== 'unknown_origin') {
        try {
          const clickUrlObj = new URL(adData.clickUrl);
          const clickHostname = clickUrlObj.hostname.toLowerCase();
          const sourceHostname = rawSource.toLowerCase();

          if (
            clickHostname === sourceHostname || 
            clickHostname.endsWith('.' + sourceHostname) || 
            sourceHostname.endsWith('.' + clickHostname)
          ) {
            isSelfImpression = true;
          }
        } catch (e) {}
      }
      isSelfImpressionResult = isSelfImpression;

      const advertiserCredits = Number(userSnap?.data?.()?.credits) || 0;
      const nextAdvertiserCredits = advertiserCredits - creditCost;
      const advertiserCannotPay = !isSelfImpression && (
        !userSnap?.exists ||
        // Do not let a high-value impression cross the permitted overdraft
        // in one request.  The campaign is paused before the publisher can
        // receive a credit for an amount the advertiser cannot cover.
        nextAdvertiserCredits < -5
      );

      // When this impression raises the publisher's balance to the resume threshold,
      // collect campaigns auto-paused for credits before the transaction writes begin.
      let campaignsToResume: any[] = [];
      let hasMoreCampaignsToResume = false;
      if (!isSelfImpression && !advertiserCannotPay && pSnap?.exists && publisherRef) {
        const publisherData = pSnap.data();
        const publisherCredits = Number(publisherData?.credits) || 0;
        const nextPublisherCredits = publisherCredits + creditCost;
        const resumeWasPending = publisherData?.creditAutoResumePending === true;
        const shouldResumeCampaigns =
          nextPublisherCredits >= CREDIT_AUTO_RESUME_THRESHOLD &&
          (publisherCredits < CREDIT_AUTO_RESUME_THRESHOLD || resumeWasPending);

        if (shouldResumeCampaigns) {
          const ownedAdsQuery = db.collection('ads')
            .where('ownerUid', '==', pSnap.id)
            .select('active', 'autoPausedReason', MANUAL_PAUSE_FIELD);
          const ownedAdsSnapshot = await transaction.get(ownedAdsQuery);
          const creditPausedAds = ownedAdsSnapshot.docs.filter((campaignSnap: any) => {
            const campaignData = campaignSnap.data();
            return campaignData.active === false &&
              campaignData.autoPausedReason === CREDIT_AUTO_PAUSE_REASON &&
              campaignData[MANUAL_PAUSE_FIELD] !== true;
          });

          campaignsToResume = creditPausedAds.slice(0, MAX_AUTO_RESUMED_CAMPAIGNS_PER_IMPRESSION);
          hasMoreCampaignsToResume = creditPausedAds.length > MAX_AUTO_RESUMED_CAMPAIGNS_PER_IMPRESSION;
        }
      }

      // 3. ALL WRITES AFTER READS
      if (advertiserCannotPay) {
        // Stop the campaign before an unpaid impression can increase either
        // impression count or publisher credits. Concurrent transactions retry
        // against this update and then fail the active-campaign check above.
        transaction.update(adRef, {
          active: false,
          autoPausedReason: CREDIT_AUTO_PAUSE_REASON,
          [MANUAL_PAUSE_FIELD]: false,
        });
        transaction.set(impressionGrantRef, {
          adId,
          appId: effectiveAppId,
          publisherUid: impressionGrant.publisherUid,
          adType,
          consumedAt: new Date(),
          expiresAt: new Date(impressionGrant.expiresAtMs),
          credited: false,
          isSelfImpression,
          reason: 'insufficient_credits',
        });
        outOfCredits = true;
        return;
      }

      transaction.set(impressionGrantRef, {
        adId,
        appId: effectiveAppId,
        publisherUid: impressionGrant.publisherUid,
        adType,
        consumedAt: new Date(),
        expiresAt: new Date(impressionGrant.expiresAtMs),
        credited: !isSelfImpression,
        isSelfImpression,
      });

      if (appAttestKeyRef && verifiedAppAttestAssertion) {
        transaction.update(appAttestKeyRef, {
          signCount: verifiedAppAttestAssertion.signCount,
          lastUsedAt: new Date(),
          ...(verifiedAppAttestAssertion.validationCategory !== undefined
            ? { validationCategory: verifiedAppAttestAssertion.validationCategory }
            : {}),
          ...(verifiedAppAttestAssertion.bundleVersion !== undefined
            ? { bundleVersion: verifiedAppAttestAssertion.bundleVersion }
            : {}),
        });
      }

      // Increment ad impressions
      const currentImpressions = adData.impressions || 0;
      
      // Track origins
      const originsMap = adData.origins || {};
      const currentSourceCount = originsMap[safeSourceId] || 0;
      originsMap[safeSourceId] = currentSourceCount + 1;
      
      const lastSeenMap = adData.lastSeenByOrigin || {};
      lastSeenMap[safeSourceId] = new Date().toISOString();

      const recentViewsMap = adData.recentViewsByOrigin || {};
      const currentViews = recentViewsMap[safeSourceId] || [];
      currentViews.push({
        time: new Date().toISOString(),
        region: finalCountry || 'Unknown',
        ...(impressionRequestCountry ? { impressionRequestCountry } : {}),
        ...(countryMismatch ? { countryMismatch: true } : {}),
        ...(pagePath ? { pagePath } : {}),
        ...(isWebImpression ? { visiblePercent, visibleDurationMs, serverMeasuredAgeMs } : {})
      });
      if (currentViews.length > 40) {
        currentViews.splice(0, currentViews.length - 40);
      }
      recentViewsMap[safeSourceId] = currentViews;

      transaction.update(adRef, { 
        impressions: currentImpressions + 1,
        origins: originsMap,
        lastSeenByOrigin: lastSeenMap,
        recentViewsByOrigin: recentViewsMap
      });

      // Only deduct credits if NOT a self-impression
      if (!isSelfImpression) {
        if (userSnap && userSnap.exists && userRef) {
          const userData = userSnap.data();
          if (userData) {
            const currentCredits = userData.credits || 0;
            const email = userData.email;
            const currentNotificationStage = userData.creditNotificationStage || 'none';
            const nextCredits = currentCredits - creditCost;
            let nextNotificationStage = currentNotificationStage;

            const dateKey = new Date().toISOString().split('T')[0];
            const dailySpend = userData.dailySpend || {};
            dailySpend[dateKey] = (dailySpend[dateKey] || 0) + creditCost;
            pruneDailyMap(dailySpend);

            // Track daily advertiser-side impressions for the campaign owner
            const dailyAdvertiserImpressions = userData.dailyAdvertiserImpressions || {};
            dailyAdvertiserImpressions[dateKey] = (dailyAdvertiserImpressions[dateKey] || 0) + 1;
            pruneDailyMap(dailyAdvertiserImpressions);

            if (nextCredits <= 0) {
              nextNotificationStage = 'out_of_credits';
              if (
                currentNotificationStage !== 'out_of_credits' &&
                currentCredits > 0 &&
                email &&
                userData.lastOutOfCreditsEmailMonth !== outOfCreditsEmailMonth
              ) {
                sendCreditNotification = true;
                creditNotificationType = 'out_of_credits';
                creditNotificationEmail = email;
              }
            } else if (nextCredits < 25) {
              nextNotificationStage = 'low';
              if (currentNotificationStage !== 'low' && currentCredits >= 25 && email) {
                sendCreditNotification = true;
                creditNotificationType = 'low';
                creditNotificationEmail = email;
              }
            } else {
              nextNotificationStage = 'none';
            }

            const userUpdate: Record<string, any> = {
              credits: nextCredits,
              dailySpend,
              dailyAdvertiserImpressions,
              creditNotificationStage: nextNotificationStage,
            };
            if (sendCreditNotification && creditNotificationType === 'out_of_credits') {
              userUpdate.lastOutOfCreditsEmailMonth = outOfCreditsEmailMonth;
            }
            transaction.update(userRef, userUpdate);

            if (nextCredits <= -5) {
              if (adData.active === true) {
                transaction.update(adRef, {
                  active: false,
                  autoPausedReason: CREDIT_AUTO_PAUSE_REASON,
                  [MANUAL_PAUSE_FIELD]: false,
                });
              }
            }
          }
        }

        // Add credits to publisher if NOT a self-impression
        if (pSnap && pSnap.exists && publisherRef) {
          const pData = pSnap.data();
          if (pData) {
             const pCredits = Number(pData.credits) || 0;
             
             // Build earnings log entry for publisher visibility
             const earningsLog = pData.earningsLog || {};
             const logKey = effectiveAppId ? `${effectiveAppId}_${adId}` : adId;
             const legacyKey = earningsLog[logKey] ? null : (earningsLog[adId] ? adId : null);
             const existing = legacyKey ? earningsLog[legacyKey] : (earningsLog[logKey] || {});
             if (legacyKey && legacyKey !== logKey) {
               delete earningsLog[legacyKey];
             }
             const currentViews = existing.recentViews || [];
             currentViews.push({
               time: new Date().toISOString(),
               region: finalCountry || 'Unknown',
                creditsEarned: creditCost,
                ...(impressionRequestCountry ? { impressionRequestCountry } : {}),
                ...(countryMismatch ? { countryMismatch: true } : {}),
                ...(isWebImpression ? { visiblePercent, visibleDurationMs, serverMeasuredAgeMs } : {})
             });
             if (currentViews.length > 40) currentViews.splice(0, currentViews.length - 40);

             earningsLog[logKey] = {
               adId: adId,
               adTitle: adData.title || 'Unknown Campaign',
               adDescription: adData.description || '',
               adImageUrl: adData.imageUrl || '',
               adType: adType,
               appId: effectiveAppId || '',
               platform: normalizedPlatform || existing.platform || '',
               appName: normalizedAppName || existing.appName || '',
               impressions: (existing.impressions || 0) + 1,
               clicks: existing.clicks || 0,
               creditsEarned: (existing.creditsEarned || 0) + creditCost,
               lastUpdated: new Date().toISOString(),
               recentViews: currentViews,
             };
             const dateKey = new Date().toISOString().split('T')[0];
             const dailyEarnings = pData.dailyEarnings || {};
             dailyEarnings[dateKey] = (dailyEarnings[dateKey] || 0) + creditCost;
             pruneDailyMap(dailyEarnings);
             const dailyImpressions = pData.dailyImpressions || {};
             dailyImpressions[dateKey] = (dailyImpressions[dateKey] || 0) + 1;
             pruneDailyMap(dailyImpressions);
             // Per-app daily tracking
             const appKey = effectiveAppId || 'unknown';
             const dailyEarningsByApp = pData.dailyEarningsByApp || {};
             if (!dailyEarningsByApp[appKey]) dailyEarningsByApp[appKey] = {};
             dailyEarningsByApp[appKey][dateKey] = (dailyEarningsByApp[appKey][dateKey] || 0) + creditCost;
             pruneDailyMapByApp(dailyEarningsByApp);
             const dailyImpressionsByApp = pData.dailyImpressionsByApp || {};
             if (!dailyImpressionsByApp[appKey]) dailyImpressionsByApp[appKey] = {};
             dailyImpressionsByApp[appKey][dateKey] = (dailyImpressionsByApp[appKey][dateKey] || 0) + 1;
             pruneDailyMapByApp(dailyImpressionsByApp);
             const nextPublisherCredits = pCredits + creditCost;
             let nextPublisherNotificationStage = pData.creditNotificationStage || 'none';

             if (nextPublisherCredits >= CREDIT_AUTO_RESUME_THRESHOLD) {
               nextPublisherNotificationStage = 'none';
             } else if (nextPublisherCredits <= 0) {
               nextPublisherNotificationStage = 'out_of_credits';
             } else {
               nextPublisherNotificationStage = 'low';
             }

             const publisherUpdate: Record<string, any> = {
               credits: nextPublisherCredits,
               earningsLog,
               dailyEarnings,
               dailyImpressions,
               dailyEarningsByApp,
               dailyImpressionsByApp,
               creditNotificationStage: nextPublisherNotificationStage,
             };
             if (nextPublisherCredits < CREDIT_AUTO_RESUME_THRESHOLD) {
               publisherUpdate.creditAutoResumePending = false;
             } else if (pCredits < CREDIT_AUTO_RESUME_THRESHOLD || pData.creditAutoResumePending === true) {
               publisherUpdate.creditAutoResumePending = hasMoreCampaignsToResume;
             }
             transaction.update(publisherRef, publisherUpdate);

             for (const campaignSnap of campaignsToResume) {
               transaction.update(campaignSnap.ref, {
                 active: true,
                 autoPausedReason: null,
                  [MANUAL_PAUSE_FIELD]: false,
               });
             }
             if (campaignsToResume.length > 0) {
               didResumeCampaigns = true;
             }
          }
        }
      } else {
        // Still log the impression in the earnings log for the publisher (even if 0 credits earned)
        if (pSnap && pSnap.exists && publisherRef) {
          const pData = pSnap.data();
          if (pData) {
             const earningsLog = pData.earningsLog || {};
             const logKey = effectiveAppId ? `${effectiveAppId}_${adId}` : adId;
             const legacyKey = earningsLog[logKey] ? null : (earningsLog[adId] ? adId : null);
             const existing = legacyKey ? earningsLog[legacyKey] : (earningsLog[logKey] || {});
             if (legacyKey && legacyKey !== logKey) {
               delete earningsLog[legacyKey];
             }
             const currentViews = existing.recentViews || [];
             currentViews.push({
               time: new Date().toISOString(),
               region: finalCountry || 'Unknown',
               creditsEarned: 0
             });
             if (currentViews.length > 40) currentViews.splice(0, currentViews.length - 40);

             earningsLog[logKey] = {
               adId: adId,
               adTitle: adData.title || 'Unknown Campaign (Self)',
               adDescription: adData.description || '',
               adImageUrl: adData.imageUrl || '',
               adType: adType,
               appId: effectiveAppId || '',
               platform: normalizedPlatform || existing.platform || '',
               appName: normalizedAppName || existing.appName || '',
               impressions: (existing.impressions || 0) + 1,
               clicks: existing.clicks || 0,
               creditsEarned: existing.creditsEarned || 0, // No new credits
               lastUpdated: new Date().toISOString(),
               recentViews: currentViews,
             };
             // Track daily impressions even for self-impressions so the chart shows all traffic
             const dateKey = new Date().toISOString().split('T')[0];
             const dailyImpressions = pData.dailyImpressions || {};
             dailyImpressions[dateKey] = (dailyImpressions[dateKey] || 0) + 1;
             pruneDailyMap(dailyImpressions);
             const appKey = effectiveAppId || 'unknown';
             const dailyImpressionsByApp = pData.dailyImpressionsByApp || {};
             if (!dailyImpressionsByApp[appKey]) dailyImpressionsByApp[appKey] = {};
             dailyImpressionsByApp[appKey][dateKey] = (dailyImpressionsByApp[appKey][dateKey] || 0) + 1;
             pruneDailyMapByApp(dailyImpressionsByApp);
             transaction.update(publisherRef, { earningsLog, dailyImpressions, dailyImpressionsByApp });
          }
        }
      }
    });

    if (outOfCredits || didResumeCampaigns) {
      invalidateActiveAdsCache();
    }

    if (duplicateImpression) {
      return NextResponse.json(
        {
          success: true,
          credited: consumedGrantData?.credited ?? false,
          duplicate: true,
          reason: 'duplicate_impression',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    if (appAttestOutOfOrder) {
      return NextResponse.json(
        { error: 'Native app integrity verification failed', reason: 'out_of_order_assertion' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (appAttestKeyMissing) {
      return NextResponse.json(
        { error: 'Native app integrity verification failed', reason: 'key_not_found' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (invalidPublisher) {
      return NextResponse.json({ error: 'Invalid App ID' }, { status: 401, headers: corsHeaders });
    }

    if (invalidNativeAttestation) {
      return NextResponse.json({ error: 'Native app integrity verification failed' }, { status: 403, headers: corsHeaders });
    }

    if (grantAdTypeMismatch) {
      return NextResponse.json({ error: 'Impression grant does not match ad type' }, { status: 403, headers: corsHeaders });
    }

    if (inactiveCampaign) {
      return NextResponse.json(
        { success: true, credited: false, reason: 'campaign_inactive' },
        { status: 200, headers: corsHeaders }
      );
    }

    if (sendCreditNotification && creditNotificationType && creditNotificationEmail) {
      const secretsData = await getCachedSecrets(db);
      const resendApiKey = secretsData.RESEND_API_KEY || process.env.RESEND_API_KEY;
      const subject = creditNotificationType === 'low'
        ? 'Your AdTogether credits are running low'
        : 'Your AdTogether account has reached zero credits';
      const html = creditNotificationType === 'low'
        ? `<p>Hi there,</p>
           <p>Your AdTogether account just dropped below 25 credits. Keep earning more credits by showing ads in your app so your campaigns keep running.</p>
           <p><strong>Tip:</strong> Display more ads or use higher-value interstitial ads to earn credits faster.</p>
           <p>Visit your dashboard to manage your campaigns and start earning again.</p>`
        : `<p>Hi there,</p>
           <p>Your AdTogether account has reached zero credits. Your campaigns will stop running until you earn more credits by showing ads.</p>
           <p>Please open the dashboard and display more ads to earn credits again.</p>`;

      await sendResendEmail({
        apiKey: resendApiKey || '',
        to: creditNotificationEmail,
        subject,
        html,
      });
    }

    if (outOfCredits) {
      return NextResponse.json(
        { error: 'Ad owner has insufficient credits' },
        { status: 402, headers: corsHeaders }
      );
    }

    if (typeof token === 'string') {
      invalidateStickyAdByToken(token);
    }

    if (isWebImpression && trustedClientIp && !isSelfImpressionResult) {
      await recordWebImpression(freqSubject);
    }

    return NextResponse.json(
      { success: true, credited: !isSelfImpressionResult },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    if (error.message === 'Ad not found') {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404, headers: corsHeaders });
    }
    console.error('Error tracking impression:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
