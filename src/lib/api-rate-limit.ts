import { createHash } from 'node:crypto';
import type { DocumentData, DocumentReference, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export type ApiRateLimitScope = 'generate' | 'screen' | 'campaign-write';

interface ConsumeUserRateLimitOptions {
  uid: string;
  scope: ApiRateLimitScope;
  limit: number;
  windowMs: number;
}

/**
 * Consume one quota unit from a Firestore-backed fixed window.  A shared
 * datastore is required here: process-local maps reset on deploys and do not
 * constrain requests handled by another instance.
 *
 * Configure Firestore TTL for the `expiresAt` field on `apiRateLimits` so
 * expired buckets are eventually removed.
 */
export async function consumeUserRateLimit({
  uid,
  scope,
  limit,
  windowMs,
}: ConsumeUserRateLimitOptions): Promise<boolean> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const bucketKey = createHash('sha256')
    .update(`${scope}:${uid}:${windowStart}`)
    .digest('hex');
  const bucketRef = adminDb.collection('apiRateLimits').doc(bucketKey) as DocumentReference<DocumentData>;

  return adminDb.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(bucketRef);
    const storedCount = snapshot.data()?.count;
    const currentCount = Number.isSafeInteger(storedCount) && storedCount > 0
      ? storedCount
      : 0;

    if (currentCount >= limit) return false;

    transaction.set(bucketRef, {
      uid,
      scope,
      windowStart,
      count: currentCount + 1,
      expiresAt: new Date(windowStart + (windowMs * 2)),
    });
    return true;
  });
}
