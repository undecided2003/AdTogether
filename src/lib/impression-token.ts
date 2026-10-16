import crypto from 'crypto';

export const IMPRESSION_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface ImpressionTokenClaims {
  version: 2;
  nonce: string;
  adId: string;
  appId: string;
  publisherUid: string;
  adType: 'banner' | 'interstitial';
  requiresWebViewability: boolean;
  country: string | null;
  /** Native attestation provider required for this grant, if the publisher enabled it. */
  nativeAttestation?: 'play-integrity' | 'app-attest' | null;
  /** The package or bundle identifier registered for the configured native app. */
  nativeAppId?: string | null;
  /** Apple App ID prefix used to validate App Attest assertions. */
  nativeAppIdPrefix?: string | null;
  nativeAttestationEnvironment?: 'production' | 'development' | null;
  issuedAtMs: number;
  expiresAtMs: number;
}

type ImpressionTokenInput = Omit<ImpressionTokenClaims, 'version' | 'nonce' | 'issuedAtMs' | 'expiresAtMs'>;

function sign(payload: string, secret: string): Buffer {
  return crypto.createHmac('sha256', secret).update(payload).digest();
}

export function createImpressionToken(input: ImpressionTokenInput, secret: string): string {
  const issuedAtMs = Date.now();
  const claims: ImpressionTokenClaims = {
    version: 2,
    nonce: crypto.randomBytes(18).toString('base64url'),
    ...input,
    issuedAtMs,
    expiresAtMs: issuedAtMs + IMPRESSION_TOKEN_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = sign(payload, secret).toString('base64url');
  return `${payload}.${signature}`;
}

export function verifyImpressionToken(
  token: unknown,
  secret: string,
  nowMs = Date.now(),
): ImpressionTokenClaims | null {
  if (typeof token !== 'string' || token.length > 2048) return null;

  const [encodedClaims, encodedSignature, extra] = token.split('.');
  if (!encodedClaims || !encodedSignature || extra !== undefined) return null;

  let claimsBytes: Buffer;
  let providedSignature: Buffer;
  try {
    claimsBytes = Buffer.from(encodedClaims, 'base64url');
    providedSignature = Buffer.from(encodedSignature, 'base64url');
  } catch {
    return null;
  }

  if (
    claimsBytes.toString('base64url') !== encodedClaims ||
    providedSignature.toString('base64url') !== encodedSignature
  ) {
    return null;
  }

  const expectedSignature = sign(encodedClaims, secret);
  if (
    providedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(claimsBytes.toString('utf8'));
  } catch {
    return null;
  }

  if (!value || typeof value !== 'object') return null;
  const claims = value as Partial<ImpressionTokenClaims>;
  if (
    claims.version !== 2 ||
    typeof claims.nonce !== 'string' || !/^[A-Za-z0-9_-]{24}$/.test(claims.nonce) ||
    typeof claims.adId !== 'string' || !claims.adId || claims.adId.length > 1500 ||
    typeof claims.appId !== 'string' || !claims.appId || claims.appId.length > 1500 ||
    typeof claims.publisherUid !== 'string' || !claims.publisherUid || claims.publisherUid.length > 1500 ||
    (claims.adType !== 'banner' && claims.adType !== 'interstitial') ||
    typeof claims.requiresWebViewability !== 'boolean' ||
    (claims.nativeAttestation !== undefined &&
      claims.nativeAttestation !== null &&
      claims.nativeAttestation !== 'play-integrity' &&
      claims.nativeAttestation !== 'app-attest') ||
    (claims.nativeAppId !== undefined && claims.nativeAppId !== null &&
      (typeof claims.nativeAppId !== 'string' || claims.nativeAppId.length > 255)) ||
    (claims.nativeAppIdPrefix !== undefined && claims.nativeAppIdPrefix !== null &&
      (typeof claims.nativeAppIdPrefix !== 'string' || !/^[A-Z0-9]{10}$/.test(claims.nativeAppIdPrefix))) ||
    (claims.nativeAttestationEnvironment !== undefined &&
      claims.nativeAttestationEnvironment !== null &&
      claims.nativeAttestationEnvironment !== 'production' &&
      claims.nativeAttestationEnvironment !== 'development') ||
    (claims.country !== null && (typeof claims.country !== 'string' || !/^[A-Z]{2}$/.test(claims.country))) ||
    !Number.isSafeInteger(claims.issuedAtMs) ||
    !Number.isSafeInteger(claims.expiresAtMs)
  ) {
    return null;
  }

  if (
    claims.issuedAtMs! > nowMs + 30_000 ||
    claims.expiresAtMs! <= nowMs ||
    claims.expiresAtMs! <= claims.issuedAtMs! ||
    claims.expiresAtMs! - claims.issuedAtMs! > IMPRESSION_TOKEN_TTL_MS
  ) {
    return null;
  }

  return claims as ImpressionTokenClaims;
}
