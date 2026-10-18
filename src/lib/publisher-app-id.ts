import type { DocumentData, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

interface PublisherCacheEntry {
  publisher: QueryDocumentSnapshot<DocumentData> | null;
  expiresAt: number;
}

const publisherCache = new Map<string, PublisherCacheEntry>();
const MAX_CACHE_ENTRIES = 5000;
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes for valid publishers
const NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 60 seconds for non-existent App IDs to guard against spam
let cleanupCounter = 0;

function pruneExpired(now: number) {
  for (const [key, entry] of publisherCache) {
    if (entry.expiresAt <= now) publisherCache.delete(key);
  }
  while (publisherCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = publisherCache.keys().next().value;
    if (!oldestKey) break;
    publisherCache.delete(oldestKey);
  }
}

/**
 * Invalidate cached publisher lookups. Call when App IDs are created, modified, or deleted.
 */
export function invalidatePublisherCache(appId?: string): void {
  if (appId) {
    publisherCache.delete(appId.trim());
  } else {
    publisherCache.clear();
  }
}

/**
 * Resolve a public App ID to its publisher across the current and legacy
 * account shapes. A collision is intentionally treated as invalid rather
 * than choosing an arbitrary account.
 *
 * Employs a bounded in-memory cache to avoid executing 4 parallel Firestore queries
 * on every public ad request.
 */
export async function findPublisherByAppId(
  db: Firestore,
  appId: string,
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const normalizedAppId = typeof appId === 'string' ? appId.trim() : '';
  if (!normalizedAppId) return null;

  const now = Date.now();
  if (++cleanupCounter % 128 === 0 || publisherCache.size >= MAX_CACHE_ENTRIES) {
    pruneExpired(now);
  }

  const cached = publisherCache.get(normalizedAppId);
  if (cached && cached.expiresAt > now) {
    return cached.publisher;
  }

  const users = db.collection('users');
  const snapshots = await Promise.all([
    users.where('appIds', 'array-contains', normalizedAppId).limit(2).get(),
    users.where('appId', '==', normalizedAppId).limit(2).get(),
    users.where('apiKeys', 'array-contains', normalizedAppId).limit(2).get(),
    users.where('apiKey', '==', normalizedAppId).limit(2).get(),
  ]);

  const publishers = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) publishers.set(document.id, document);
  }

  const result = publishers.size === 1 ? publishers.values().next().value ?? null : null;

  publisherCache.set(normalizedAppId, {
    publisher: result,
    expiresAt: now + (result ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });

  return result;
}
