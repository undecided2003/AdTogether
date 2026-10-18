import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { adminDb as db } from '@/lib/firebase-admin';
import { consumeAttestationRateLimit } from '@/lib/attestation-rate-limit';
import { verifyAppleAppAttestation } from '@/lib/native-attestation';
import { getNativeAttestationAppConfig, type NativeAttestationAppConfig } from '@/lib/native-attestation';
import { findPublisherByAppId } from '@/lib/publisher-app-id';
import { getTrustedRequestIp } from '@/lib/request-country';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const body = await request.json();
    const appId = typeof body?.appId === 'string' ? body.appId : '';
    const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : '';
    const keyId = typeof body?.keyId === 'string' ? body.keyId : '';
    if (!appId || appId.length > 1500 || !/^[A-Za-z0-9_-]{32}$/.test(challengeId) || !/^[A-Za-z0-9+/]{43}=$/.test(keyId)) {
      return NextResponse.json({ error: 'appId, challengeId, and keyId are required' }, { status: 400, headers: corsHeaders });
    }

    const publisher = await findPublisherByAppId(db, appId);
    if (!publisher) return NextResponse.json({ error: 'Invalid App ID' }, { status: 401, headers: corsHeaders });
    let publisherConfig: NativeAttestationAppConfig | null;
    try {
      publisherConfig = await getNativeAttestationAppConfig(db, appId, publisher.id);
    } catch (error) {
      console.error('Invalid App Attest configuration', error);
      return NextResponse.json({ error: 'App Attest configuration is invalid' }, { status: 503, headers: corsHeaders });
    }
    if (publisherConfig?.provider !== 'app-attest') {
      return NextResponse.json({ error: 'App Attest is not enabled for this application' }, { status: 409, headers: corsHeaders });
    }
    if (!(await consumeAttestationRateLimit({
      db,
      scope: 'apple-register',
      appId,
      clientIp: trustedClientIp,
      limit: trustedClientIp ? 20 : 60,
    }))) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }
    const challengeIdHash = createHash('sha256').update(challengeId).digest('hex');
    const challengeRef = db.collection('appAttestChallenges').doc(challengeIdHash);
    const challengeSnap = await challengeRef.get();
    if (!challengeSnap.exists) return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 403, headers: corsHeaders });
    const challengeData = challengeSnap.data();
    const challengeExpiresAt = challengeData?.expiresAt?.toDate?.().getTime?.();
    if (
      challengeData?.challengeIdHash !== challengeIdHash ||
      challengeData.appId !== appId ||
      challengeData.publisherUid !== publisher.id ||
      challengeData.bundleId !== publisherConfig.bundleId ||
      challengeData.appIdPrefix !== publisherConfig.appIdPrefix ||
      challengeData.environment !== publisherConfig.environment ||
      !Number.isFinite(challengeExpiresAt) || challengeExpiresAt <= Date.now()
    ) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 403, headers: corsHeaders });
    }

    const challenge = Buffer.from(challengeData.challenge, 'base64url');
    const verified = verifyAppleAppAttestation({
      attestationObject: body?.attestationObject,
      keyId,
      challenge,
      appIdPrefix: challengeData.appIdPrefix,
      bundleId: challengeData.bundleId,
      environment: challengeData.environment,
    });
    if (!verified) return NextResponse.json({ error: 'App Attest verification failed' }, { status: 403, headers: corsHeaders });

    const keyDocumentId = createHash('sha256').update(keyId).digest('hex');
    const keyRef = db.collection('appAttestKeys').doc(keyDocumentId);
    let challengeConsumed = false;
    await db.runTransaction(async (transaction: Transaction) => {
      const currentChallenge = await transaction.get(challengeRef as DocumentReference);
      const currentKey = await transaction.get(keyRef as DocumentReference);
      const currentData = currentChallenge.data();
      const currentExpiry = currentData?.expiresAt?.toDate?.().getTime?.();
      challengeConsumed = false;
      if (
        !currentChallenge.exists || currentKey.exists || currentData?.challengeIdHash !== challengeIdHash ||
        currentData?.appId !== appId || currentData?.publisherUid !== publisher.id ||
        currentData?.bundleId !== publisherConfig.bundleId || currentData?.appIdPrefix !== publisherConfig.appIdPrefix ||
        currentData?.environment !== publisherConfig.environment ||
        !Number.isFinite(currentExpiry) || currentExpiry <= Date.now() || currentData?.consumedAt
      ) return;

      transaction.update(challengeRef, { consumedAt: new Date() });
      transaction.create(keyRef, {
        keyId,
        appId,
        publisherUid: publisher.id,
        bundleId: challengeData.bundleId,
        appIdPrefix: challengeData.appIdPrefix,
        environment: verified.environment,
        publicKeySpki: verified.publicKeySpki,
        signCount: verified.signCount,
        ...(verified.validationCategory !== undefined
          ? { validationCategory: verified.validationCategory }
          : {}),
        ...(verified.bundleVersion !== undefined
          ? { bundleVersion: verified.bundleVersion }
          : {}),
        createdAt: new Date(),
      });
      challengeConsumed = true;
    });

    if (!challengeConsumed) return NextResponse.json({ error: 'Challenge has already been used' }, { status: 409, headers: corsHeaders });
    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Could not register App Attest key', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
