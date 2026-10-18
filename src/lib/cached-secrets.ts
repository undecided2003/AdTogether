import type { DocumentData, Firestore } from 'firebase-admin/firestore';

interface CachedSecretsEntry {
  data: DocumentData;
  expiresAt: number;
}

let cachedSecretsEntry: CachedSecretsEntry | null = null;
const SECRETS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Retrieve the config/secrets document with in-memory caching.
 */
export async function getCachedSecrets(db: Firestore): Promise<DocumentData> {
  const now = Date.now();
  if (cachedSecretsEntry && cachedSecretsEntry.expiresAt > now) {
    return cachedSecretsEntry.data;
  }

  try {
    const configSnap = await db.collection('config').doc('secrets').get();
    const secretsData = configSnap.data() || {};
    cachedSecretsEntry = {
      data: secretsData,
      expiresAt: now + SECRETS_CACHE_TTL_MS,
    };
    return secretsData;
  } catch (error) {
    console.error('Failed to fetch config/secrets from Firestore:', error);
    return cachedSecretsEntry?.data || {};
  }
}

/**
 * Retrieve the API secret key with in-memory caching.
 * Falls back to process.env.API_SECRET if the Firestore document is missing or fails.
 */
export async function getCachedApiSecret(db: Firestore): Promise<string | undefined> {
  const secrets = await getCachedSecrets(db);
  const secret = secrets.API_SECRET || process.env.API_SECRET;
  return typeof secret === 'string' && secret ? secret : undefined;
}

/**
 * Retrieve a specific secret from config/secrets with in-memory caching and optional env fallback.
 */
export async function getCachedSecretValue(
  db: Firestore,
  secretKey: string,
  envFallbackKey?: string,
): Promise<string | undefined> {
  const secrets = await getCachedSecrets(db);
  const val = secrets[secretKey] || (envFallbackKey ? process.env[envFallbackKey] : undefined);
  return typeof val === 'string' && val ? val : undefined;
}

export function invalidateCachedSecrets(): void {
  cachedSecretsEntry = null;
}
