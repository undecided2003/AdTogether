import { createHash } from 'node:crypto';
import type { DocumentData, DocumentReference, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export type PublicAdRateLimitScope = 'serve' | 'impression' | 'click';

interface ConsumePublicAdRateLimitOptions {
  scope: PublicAdRateLimitScope;
  appId: string;
  clientIp: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}

/**
 * Consume one public ad endpoint quota unit from a shared fixed window.
 * The document ID binds the endpoint, App ID, and a client IP supplied by a
 * configured ingress without retaining the raw address in Firestore.
 */
export async function consumePublicAdRateLimit({
  scope,
  appId,
  clientIp,
  limit,
  windowMs,
  nowMs = Date.now(),
}: ConsumePublicAdRateLimitOptions): Promise<boolean> {
  if (!Number.isSafeInteger(limit) || limit <= 0 || !Number.isSafeInteger(windowMs) || windowMs <= 0) {
    throw new Error('Invalid public ad rate-limit configuration');
  }

  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  const documentId = createHash('sha256')
    .update(scope)
    .update('\u0000')
    .update(appId)
    .update('\u0000')
    .update(clientIp)
    .update('\u0000')
    .update(String(windowStart))
    .digest('hex');
  const bucketRef = adminDb.collection('publicAdRateLimits').doc(documentId) as DocumentReference<DocumentData>;

  return adminDb.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(bucketRef);
    const storedCount = snapshot.data()?.count;
    const currentCount = Number.isSafeInteger(storedCount) && storedCount > 0
      ? storedCount
      : 0;

    if (currentCount >= limit) return false;

    transaction.set(bucketRef, {
      scope,
      appId,
      windowStart,
      count: currentCount + 1,
      expiresAt: new Date(windowStart + (windowMs * 2)),
    });
    return true;
  });
}
