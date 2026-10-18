import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import { consumeAttestationRateLimit } from '@/lib/attestation-rate-limit';
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
    if (!appId || appId.length > 1500) return NextResponse.json({ error: 'A valid App ID is required' }, { status: 400, headers: corsHeaders });

    const publisher = await findPublisherByAppId(db, appId);
    if (!publisher) return NextResponse.json({ error: 'Invalid App ID' }, { status: 401, headers: corsHeaders });
    let config: NativeAttestationAppConfig | null;
    try {
      config = await getNativeAttestationAppConfig(db, appId, publisher.id);
    } catch (error) {
      console.error('Invalid App Attest configuration', error);
      return NextResponse.json({ error: 'App Attest configuration is invalid' }, { status: 503, headers: corsHeaders });
    }
    if (config?.provider !== 'app-attest') {
      return NextResponse.json({ error: 'App Attest is not enabled for this application' }, { status: 409, headers: corsHeaders });
    }
    if (!(await consumeAttestationRateLimit({
      db,
      scope: 'apple-challenge',
      appId,
      clientIp: trustedClientIp,
      limit: trustedClientIp ? 20 : 60,
    }))) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: corsHeaders });
    }

    const challengeId = randomBytes(24).toString('base64url');
    const challenge = randomBytes(32).toString('base64url');
    const challengeDocumentId = createHash('sha256').update(challengeId).digest('hex');
    await db.collection('appAttestChallenges').doc(challengeDocumentId).create({
      challengeIdHash: challengeDocumentId,
      challenge,
      appId,
      publisherUid: publisher.id,
      bundleId: config.bundleId,
      appIdPrefix: config.appIdPrefix,
      environment: config.environment,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });

    return NextResponse.json({ challengeId, challenge, environment: config.environment }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Could not create App Attest challenge', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
