import { createHash, createPublicKey, X509Certificate, verify as verifySignature } from 'crypto';
import { GoogleAuth } from 'google-auth-library';

export function impressionRequestHash(grantToken: string): string {
  return createHash('sha256').update(grantToken, 'utf8').digest('base64url');
}

export interface NativeAttestationAppConfig {
  provider: 'play-integrity' | 'app-attest';
  bundleId: string;
  playIntegrityProjectNumber?: string;
  appIdPrefix?: string;
  environment: 'production' | 'development';
}

interface FirestoreDocumentSnapshot {
  exists: boolean;
  data(): unknown;
}

interface FirestoreReadClient {
  collection(collectionPath: string): {
    doc(documentPath: string): {
      get(): Promise<FirestoreDocumentSnapshot>;
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const PLAY_INTEGRITY_PROJECT_NUMBER_PATTERN = /^\d{5,19}$/;
const MAX_SIGNED_LONG = '9223372036854775807';

function isValidPlayIntegrityProjectNumber(value: string): boolean {
  return PLAY_INTEGRITY_PROJECT_NUMBER_PATTERN.test(value) &&
    (value.length < MAX_SIGNED_LONG.length || value <= MAX_SIGNED_LONG);
}

function getDeploymentPlayIntegrityProjectNumber(): string | null {
  const configured = process.env.PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER?.replace(/^"(.*)"$/, '$1').trim();
  return configured && isValidPlayIntegrityProjectNumber(configured) ? configured : null;
}

export function parseNativeAttestationAppConfig(candidate: unknown): NativeAttestationAppConfig | null {
  if (!isRecord(candidate)) return null;
  if (
    (candidate.provider !== 'play-integrity' && candidate.provider !== 'app-attest') ||
    typeof candidate.bundleId !== 'string' || candidate.bundleId.length > 255 ||
    !/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(candidate.bundleId)
  ) return null;

  if (candidate.provider === 'play-integrity') {
    if (typeof candidate.playIntegrityProjectNumber !== 'string' ||
        !isValidPlayIntegrityProjectNumber(candidate.playIntegrityProjectNumber)) return null;
    const deploymentProjectNumber = getDeploymentPlayIntegrityProjectNumber();
    if (!deploymentProjectNumber || candidate.playIntegrityProjectNumber !== deploymentProjectNumber) return null;
    if (candidate.environment !== undefined && candidate.environment !== 'production' && candidate.environment !== 'development') return null;
    return {
      provider: candidate.provider,
      bundleId: candidate.bundleId,
      playIntegrityProjectNumber: candidate.playIntegrityProjectNumber,
      environment: candidate.environment || 'production',
    };
  }

  if (typeof candidate.appIdPrefix !== 'string' || !/^[A-Z0-9]{10}$/.test(candidate.appIdPrefix)) return null;
  if (candidate.environment !== undefined && candidate.environment !== 'production' && candidate.environment !== 'development') return null;
  return {
    provider: candidate.provider,
    bundleId: candidate.bundleId,
    appIdPrefix: candidate.appIdPrefix,
    environment: candidate.environment || 'production',
  };
}

export async function getNativeAttestationAppConfig(
  db: FirestoreReadClient,
  appId: string,
  publisherUid: string,
): Promise<NativeAttestationAppConfig | null> {
  const documentId = createHash('sha256').update(appId).digest('hex');
  const configSnap = await db.collection('nativeAttestationApps').doc(documentId).get();
  if (!configSnap.exists) return null;
  const data = configSnap.data();
  if (!isRecord(data) || data.enabled !== true) return null;
  if (data.appId !== appId || data.publisherUid !== publisherUid) {
    throw new Error('Native attestation configuration identity mismatch');
  }
  const config = parseNativeAttestationAppConfig(data);
  if (!config) throw new Error('Native attestation configuration is invalid');
  return config;
}

function sha256(value: Buffer | string): Buffer {
  return createHash('sha256').update(value).digest();
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && left.equals(right);
}

let playIntegrityAuth: GoogleAuth | null = null;
let playIntegrityClientPromise: ReturnType<GoogleAuth['getClient']> | null = null;

function getPlayIntegrityAuth(): GoogleAuth {
  if (playIntegrityAuth) return playIntegrityAuth;

  const credentialEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"(.*)"$/, '$1');
  const credentialPrivateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/^"(.*)"$/, '$1')
    .replace(/\\n/g, '\n');
  playIntegrityAuth = new GoogleAuth({
    projectId: process.env.FIREBASE_PROJECT_ID?.replace(/^"(.*)"$/, '$1'),
    ...(credentialEmail && credentialPrivateKey
      ? { credentials: { client_email: credentialEmail, private_key: credentialPrivateKey } }
      : {}),
    scopes: ['https://www.googleapis.com/auth/playintegrity'],
  });
  return playIntegrityAuth;
}

async function getPlayIntegrityAccessToken(): Promise<string | null> {
  const auth = getPlayIntegrityAuth();
  if (!playIntegrityClientPromise) {
    playIntegrityClientPromise = auth.getClient().catch((error) => {
      // Allow a transient metadata-server or credential failure to recover on a later request.
      playIntegrityClientPromise = null;
      throw error;
    });
  }
  const client = await playIntegrityClientPromise;
  const accessToken = await client.getAccessToken();
  const bearer = typeof accessToken === 'string' ? accessToken : accessToken?.token;
  return bearer || null;
}

export async function verifyPlayIntegrityToken(input: {
  integrityToken: unknown;
  packageName: string;
  expectedRequestHash: string;
  environment?: 'production' | 'development' | null;
}): Promise<boolean> {
  if (typeof input.integrityToken !== 'string' || input.integrityToken.length > 20_000 || input.packageName.length > 255) return false;
  if (!/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/.test(input.packageName)) return false;

  try {
    const bearer = await getPlayIntegrityAccessToken();
    if (!bearer) return false;

    const response = await fetch(
      `https://playintegrity.googleapis.com/v1/${encodeURIComponent(input.packageName)}:decodeIntegrityToken`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrity_token: input.integrityToken }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) {
      console.error('Play Integrity decode failed', response.status);
      return false;
    }

    const decoded = await response.json() as {
      tokenPayloadExternal?: {
        requestDetails?: { requestPackageName?: string; requestHash?: string; timestampMillis?: string | number };
        appIntegrity?: { appRecognitionVerdict?: string; packageName?: string };
        deviceIntegrity?: { deviceRecognitionVerdict?: string[] };
        accountDetails?: { appLicensingVerdict?: string };
      };
    };
    const payload = decoded.tokenPayloadExternal;
    const details = payload?.requestDetails;
    const timestamp = Number(details?.timestampMillis);
    const verdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict || [];
    const isProduction = input.environment !== 'development';
    const licensingOk = isProduction
      ? payload?.accountDetails?.appLicensingVerdict === 'LICENSED'
      : true;

    return Boolean(
      details?.requestPackageName === input.packageName &&
      details.requestHash === input.expectedRequestHash &&
      Number.isFinite(timestamp) &&
      Math.abs(Date.now() - timestamp) <= 5 * 60_000 &&
      payload?.appIntegrity?.appRecognitionVerdict === 'PLAY_RECOGNIZED' &&
      payload.appIntegrity.packageName === input.packageName &&
      verdicts.includes('MEETS_DEVICE_INTEGRITY') &&
      licensingOk
    );
  } catch (error) {
    console.error('Play Integrity verification failed', error);
    return false;
  }
}

// Apple publishes this dedicated trust anchor for App Attest object verification.
const APPLE_APP_ATTEST_ROOT_PEM = `-----BEGIN CERTIFICATE-----
MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYw
JAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwK
QXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNa
Fw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlv
biBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9y
bmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdh
NbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9au
Yen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/
MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYw
CgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn
53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijV
oyFraWVIyd/dganmrduC1bmTBGwD
-----END CERTIFICATE-----`;

const MAX_CBOR_INPUT_BYTES = 128 * 1024;
const MAX_CBOR_DEPTH = 16;
const MAX_CBOR_ITEMS = 4_096;
const MAX_CBOR_CONTAINER_ENTRIES = 1_024;
const MAX_CBOR_BYTE_STRING_LENGTH = 96 * 1024;
const MAX_CBOR_TEXT_STRING_LENGTH = 4 * 1024;

interface CborMap {
  [key: string]: CborValue;
}

type CborValue = Buffer | string | number | boolean | null | CborValue[] | CborMap;

interface CborDecodeState {
  offset: number;
  items: number;
}

function readCborLength(data: Buffer, offset: number, additional: number): { length: number; next: number } {
  if (additional < 24) return { length: additional, next: offset };
  const width = additional === 24 ? 1 : additional === 25 ? 2 : additional === 26 ? 4 : additional === 27 ? 8 : 0;
  if (!width || offset + width > data.length) throw new Error('Invalid CBOR length');
  let value = 0;
  for (let i = 0; i < width; i++) {
    const byte = data[offset + i];
    if (value > Math.floor((Number.MAX_SAFE_INTEGER - byte) / 256)) {
      throw new Error('CBOR length too large');
    }
    value = value * 256 + byte;
  }
  return { length: value, next: offset + width };
}

function isCborMap(value: CborValue): value is CborMap {
  return Boolean(value) && typeof value === 'object' && !Buffer.isBuffer(value) && !Array.isArray(value);
}

function decodeCborValue(data: Buffer, state: CborDecodeState, depth = 0): CborValue {
  if (depth > MAX_CBOR_DEPTH) throw new Error('CBOR nesting is too deep');
  if (++state.items > MAX_CBOR_ITEMS) throw new Error('CBOR contains too many values');
  if (state.offset >= data.length) throw new Error('Unexpected end of CBOR');
  const initial = data[state.offset++];
  const major = initial >> 5;
  const additional = initial & 31;
  if (additional === 31) throw new Error('Indefinite CBOR values are not accepted');
  if (major === 7) {
    if (additional === 20) return false;
    if (additional === 21) return true;
    if (additional === 22) return null;
    throw new Error('Unsupported CBOR simple value');
  }

  const { length, next } = readCborLength(data, state.offset, additional);
  state.offset = next;
  if (major === 0) return length;
  if (major === 1) return -1 - length;
  if (major === 2 || major === 3) {
    const maxLength = major === 2 ? MAX_CBOR_BYTE_STRING_LENGTH : MAX_CBOR_TEXT_STRING_LENGTH;
    if (length > maxLength) throw new Error('CBOR string is too large');
    if (state.offset + length > data.length) throw new Error('CBOR value exceeds input');
    const value = data.subarray(state.offset, state.offset + length);
    state.offset += length;
    if (major === 2) return Buffer.from(value);
    const text = value.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(value)) throw new Error('Invalid CBOR UTF-8 string');
    return text;
  }
  if (major === 4) {
    if (length > MAX_CBOR_CONTAINER_ENTRIES) throw new Error('CBOR array is too large');
    const values: CborValue[] = [];
    for (let i = 0; i < length; i++) values.push(decodeCborValue(data, state, depth + 1));
    return values;
  }
  if (major === 5) {
    if (length > MAX_CBOR_CONTAINER_ENTRIES) throw new Error('CBOR map is too large');
    const values = Object.create(null) as CborMap;
    for (let i = 0; i < length; i++) {
      const key = decodeCborValue(data, state, depth + 1);
      if (typeof key !== 'string' && typeof key !== 'number') throw new Error('Invalid CBOR map key');
      const normalizedKey = String(key);
      if (Object.prototype.hasOwnProperty.call(values, normalizedKey)) {
        throw new Error('Duplicate CBOR map key');
      }
      values[normalizedKey] = decodeCborValue(data, state, depth + 1);
    }
    return values;
  }
  throw new Error('Unsupported CBOR type');
}

function decodeCbor(data: Buffer): CborValue {
  if (data.length > MAX_CBOR_INPUT_BYTES) throw new Error('CBOR input is too large');
  const state: CborDecodeState = { offset: 0, items: 0 };
  const value = decodeCborValue(data, state);
  if (state.offset !== data.length) throw new Error('Trailing CBOR data');
  return value;
}

interface AppAttestExtensions {
  validationCategory?: number;
  bundleVersion?: string;
}

function decodeAppleValidationCategory(value: CborValue | undefined): number | null {
  // Current Apple payloads encode this UInt32 as a four-byte, little-endian CBOR byte string.
  // Accept a CBOR integer too so the verifier remains compatible with a conforming encoding.
  if (Buffer.isBuffer(value)) {
    return value.length === 4 ? value.readUInt32LE(0) : null;
  }
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 0xffff_ffff
    ? value
    : null;
}

function decodeAppAttestExtensions(authData: Buffer, extensionOffset: number): AppAttestExtensions | null {
  const extensionFlagSet = (authData[32] & 0x80) !== 0;
  const extensionBytes = authData.subarray(extensionOffset);
  if (extensionBytes.length === 0) return extensionFlagSet ? null : {};

  const extensions = decodeCbor(extensionBytes);
  if (!isCborMap(extensions)) return null;
  const validationCategory = decodeAppleValidationCategory(extensions.apple_validation_category_01);
  const bundleVersion = extensions.apple_bundle_version_01;
  if (
    validationCategory === null ||
    validationCategory < 1 ||
    validationCategory > 6 ||
    typeof bundleVersion !== 'string' ||
    bundleVersion.length === 0 ||
    Buffer.byteLength(bundleVersion, 'utf8') > 255
  ) return null;

  return { validationCategory, bundleVersion };
}

function readDerTlv(data: Buffer, offset: number): { tag: number; start: number; end: number; next: number } {
  if (offset + 2 > data.length) throw new Error('Invalid DER value');
  const tag = data[offset];
  let length = data[offset + 1];
  let start = offset + 2;
  if (length & 0x80) {
    const width = length & 0x7f;
    if (width === 0 || width > 4 || start + width > data.length) throw new Error('Invalid DER length');
    length = 0;
    for (let i = 0; i < width; i++) length = length * 256 + data[start + i];
    start += width;
  }
  const end = start + length;
  if (end > data.length) throw new Error('DER value exceeds input');
  return { tag, start, end, next: end };
}

function extractAppAttestNonce(certDer: Buffer): Buffer | null {
  // id-ce nonce extension used by Apple App Attest: 1.2.840.113635.100.8.2
  const oid = Buffer.from([0x06, 0x0a, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x08, 0x02]);
  const oidOffset = certDer.indexOf(oid);
  if (oidOffset < 0) return null;
  let cursor = oidOffset + oid.length;
  let value = readDerTlv(certDer, cursor);
  if (value.tag === 0x01) {
    cursor = value.next;
    value = readDerTlv(certDer, cursor);
  }
  if (value.tag !== 0x04) return null;
  const extensionBytes = certDer.subarray(value.start, value.end);
  const sequence = readDerTlv(extensionBytes, 0);
  if (sequence.tag !== 0x30) return null;
  const nonce = readDerTlv(extensionBytes, sequence.start);
  if (nonce.tag !== 0x04 || nonce.next !== sequence.end) return null;
  return Buffer.from(extensionBytes.subarray(nonce.start, nonce.end));
}

function x509IsCurrent(certificate: X509Certificate, nowMs: number): boolean {
  return Date.parse(certificate.validFrom) <= nowMs && Date.parse(certificate.validTo) > nowMs;
}

export interface VerifiedAppAttestRegistration {
  publicKeySpki: string;
  signCount: number;
  environment: 'production' | 'development';
  validationCategory?: number;
  bundleVersion?: string;
}

export function verifyAppleAppAttestation(input: {
  attestationObject: unknown;
  keyId: string;
  challenge: Buffer;
  appIdPrefix: string;
  bundleId: string;
  environment: 'production' | 'development';
}): VerifiedAppAttestRegistration | null {
  try {
    if (typeof input.attestationObject !== 'string' || input.attestationObject.length > 100_000) return null;
    if (!/^[A-Za-z0-9+/]{43}=$/.test(input.keyId)) return null;
    const encoded = Buffer.from(input.attestationObject, 'base64');
    if (encoded.toString('base64').replace(/=+$/, '') !== input.attestationObject.replace(/=+$/, '')) return null;
    const root = decodeCbor(encoded);
    if (!isCborMap(root)) return null;
    const object = root;
    const attStmt = object.attStmt;
    if (object.fmt !== 'apple-appattest' || !Buffer.isBuffer(object.authData) || !isCborMap(attStmt)) return null;
    const authData = object.authData;
    const statement = attStmt;
    const certs = statement.x5c;
    if (!Array.isArray(certs) || certs.length < 2 || !certs.every(Buffer.isBuffer)) return null;
    if (authData.length < 55) return null;

    const expectedRpIdHash = sha256(`${input.appIdPrefix}.${input.bundleId}`);
    if (!safeEqual(authData.subarray(0, 32), expectedRpIdHash)) return null;
    if ((authData[32] & 0x40) === 0) return null;
    const signCount = authData.readUInt32BE(33);
    if (signCount !== 0) return null;
    const aaguid = authData.subarray(37, 53);
    const expectedAaguid = input.environment === 'production'
      ? Buffer.concat([Buffer.from('appattest'), Buffer.alloc(7)])
      : Buffer.from('appattestdevelop');
    if (!safeEqual(aaguid, expectedAaguid)) return null;

    const credentialIdLength = authData.readUInt16BE(53);
    const credentialIdStart = 55;
    const coseStart = credentialIdStart + credentialIdLength;
    if (!credentialIdLength || coseStart >= authData.length) return null;
    const credentialId = authData.subarray(credentialIdStart, coseStart);
    const suppliedKeyId = Buffer.from(input.keyId, 'base64');
    if (!safeEqual(credentialId, suppliedKeyId)) return null;

    const coseState: CborDecodeState = { offset: 0, items: 0 };
    const coseBytes = authData.subarray(coseStart);
    if (coseBytes.length > MAX_CBOR_INPUT_BYTES) return null;
    const cose = decodeCborValue(coseBytes, coseState);
    const extensions = decodeAppAttestExtensions(authData, coseStart + coseState.offset);
    if (!isCborMap(cose) || !extensions) return null;
    const coseKey = cose;
    const x = coseKey['-2'];
    const y = coseKey['-3'];
    if (coseKey['1'] !== 2 || coseKey['3'] !== -7 || coseKey['-1'] !== 1 ||
        !Buffer.isBuffer(x) || !Buffer.isBuffer(y) || x.length !== 32 || y.length !== 32) return null;
    const uncompressedPublicKey = Buffer.concat([Buffer.from([0x04]), x, y]);
    if (!safeEqual(sha256(uncompressedPublicKey), credentialId)) return null;

    const leaf = new X509Certificate(certs[0]);
    const intermediate = new X509Certificate(certs[1]);
    const rootCertificate = new X509Certificate(APPLE_APP_ATTEST_ROOT_PEM);
    const now = Date.now();
    if (!x509IsCurrent(leaf, now) || !x509IsCurrent(intermediate, now) ||
        leaf.issuer !== intermediate.subject || !leaf.verify(intermediate.publicKey) ||
        intermediate.issuer !== rootCertificate.subject || !intermediate.verify(rootCertificate.publicKey)) return null;

    const certificateKey = leaf.publicKey.export({ format: 'jwk' });
    if (certificateKey.kty !== 'EC' || certificateKey.crv !== 'P-256' ||
        !safeEqual(Buffer.from(certificateKey.x || '', 'base64url'), x) ||
        !safeEqual(Buffer.from(certificateKey.y || '', 'base64url'), y)) return null;
    const clientDataHash = sha256(input.challenge);
    const expectedNonce = sha256(Buffer.concat([authData, clientDataHash]));
    const certificateNonce = extractAppAttestNonce(leaf.raw);
    if (!certificateNonce || !safeEqual(certificateNonce, expectedNonce)) return null;

    const coseJwk = {
      kty: 'EC',
      crv: 'P-256',
      x: x.toString('base64url'),
      y: y.toString('base64url'),
    };
    const publicKeyObject = createPublicKey({ key: coseJwk, format: 'jwk' });
    return {
      publicKeySpki: publicKeyObject.export({ type: 'spki', format: 'der' }).toString('base64'),
      signCount,
      environment: input.environment,
      ...extensions,
    };
  } catch (error) {
    console.error('Apple App Attest registration validation failed', error);
    return null;
  }
}

export interface VerifiedAppAttestAssertion {
  keyDocumentId: string;
  signCount: number;
  validationCategory?: number;
  bundleVersion?: string;
}

export async function verifyAppleAppAssertion(input: {
  db: FirestoreReadClient;
  keyId: unknown;
  assertion: unknown;
  grantToken: string;
  appId: string;
  publisherUid: string;
  expectedBundleId: string;
  expectedAppIdPrefix: string;
  expectedEnvironment: 'production' | 'development';
}): Promise<VerifiedAppAttestAssertion | null> {
  try {
    if (typeof input.keyId !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(input.keyId) ||
        typeof input.assertion !== 'string' || input.assertion.length > 20_000) return null;
    const assertionBytes = Buffer.from(input.assertion, 'base64');
    if (assertionBytes.toString('base64').replace(/=+$/, '') !== input.assertion.replace(/=+$/, '')) return null;
    const decoded = decodeCbor(assertionBytes);
    if (!isCborMap(decoded)) return null;
    const assertionObject = decoded;
    const authData = assertionObject.authenticatorData;
    const signature = assertionObject.signature;
    if (!Buffer.isBuffer(authData) || !Buffer.isBuffer(signature) || authData.length < 37) return null;
    const extensions = decodeAppAttestExtensions(authData, 37);
    if (!extensions) return null;

    const keyDocId = sha256(input.keyId).toString('hex');
    const keyRef = input.db.collection('appAttestKeys').doc(keyDocId);
    const keySnap = await keyRef.get();
    if (!keySnap.exists) return null;
    const key = keySnap.data();
    if (!isRecord(key)) return null;
    const storedBundleId = key.bundleId;
    const storedAppIdPrefix = key.appIdPrefix;
    const storedPublicKeySpki = key.publicKeySpki;
    const storedSignCount = key.signCount;
    if (key.keyId !== input.keyId || key.appId !== input.appId || key.publisherUid !== input.publisherUid ||
        storedBundleId !== input.expectedBundleId || storedAppIdPrefix !== input.expectedAppIdPrefix ||
        key.environment !== input.expectedEnvironment ||
        typeof storedBundleId !== 'string' || typeof storedAppIdPrefix !== 'string' ||
        typeof storedPublicKeySpki !== 'string' ||
        typeof storedSignCount !== 'number' || !Number.isSafeInteger(storedSignCount)) return null;

    const expectedRpIdHash = sha256(`${storedAppIdPrefix}.${storedBundleId}`);
    if (!safeEqual(authData.subarray(0, 32), expectedRpIdHash)) return null;
    const signCount = authData.readUInt32BE(33);
    if (signCount <= storedSignCount) return null;

    const clientDataHash = sha256(input.grantToken);
    const publicKeyObject = createPublicKey({
      key: Buffer.from(storedPublicKeySpki, 'base64'),
      format: 'der',
      type: 'spki',
    });
    if (!verifySignature('sha256', Buffer.concat([authData, clientDataHash]), publicKeyObject, signature)) return null;
    return { keyDocumentId: keyDocId, signCount, ...extensions };
  } catch (error) {
    console.error('Apple App Attest assertion validation failed', error);
    return null;
  }
}
