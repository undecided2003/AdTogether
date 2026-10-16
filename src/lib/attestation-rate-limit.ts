import { createHash } from 'crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

const WINDOW_MS = 60_000;

/**
 * A shared, per-App-ID limit for expensive attestation operations. It does
 * not use client-supplied forwarding headers and therefore cannot be evaded
 * by choosing a new address on each request or a new serverless instance.
 */
export async function consumeAttestationRateLimit(input: {
  db: Firestore;
  scope: 'apple-challenge' | 'apple-register';
  appId: string;
  clientIp?: string | null;
  limit: number;
  nowMs?: number;
}): Promise<boolean> {
  const nowMs = input.nowMs ?? Date.now();
  const bucket = Math.floor(nowMs / WINDOW_MS);
  const hasher = createHash('sha256')
    .update(input.scope)
    .update('\u0000')
    .update(input.appId);
  if (input.clientIp) {
    hasher.update('\u0000').update(input.clientIp);
  }
  const documentId = hasher
    .update('\u0000')
    .update(String(bucket))
    .digest('hex');
  const rateLimitRef = input.db.collection('attestationRateLimits').doc(documentId);
  let allowed = false;

  await input.db.runTransaction(async (transaction: Transaction) => {
    allowed = false;
    const current = await transaction.get(rateLimitRef);
    const count = Number(current.data()?.count);
    if (Number.isSafeInteger(count) && count >= input.limit) return;

    transaction.set(rateLimitRef, {
      scope: input.scope,
      appId: input.appId,
      bucket,
      count: (Number.isSafeInteger(count) && count > 0 ? count : 0) + 1,
      expiresAt: new Date(nowMs + (2 * WINDOW_MS)),
    });
    allowed = true;
  });

  return allowed;
}
