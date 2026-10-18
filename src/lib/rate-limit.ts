const MAX_ENTRIES = 10_000;
let cleanupCounter = 0;

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function normalizedKey(value: string): string {
  const normalized = typeof value === 'string' ? value.trim().slice(0, 200) : '';
  return normalized || 'unknown';
}

function pruneExpired(now: number) {
  for (const [key, entry] of rateLimitMap) {
    if (entry.expiresAt <= now) rateLimitMap.delete(key);
  }
  while (rateLimitMap.size >= MAX_ENTRIES) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (!oldestKey) break;
    rateLimitMap.delete(oldestKey);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

/**
 * Check and increment a local rate limit bucket, returning both whether the request
 * is permitted and the current in-process request count for this key.
 */
export function checkRateLimitCount(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (++cleanupCounter % 128 === 0 || rateLimitMap.size >= MAX_ENTRIES) pruneExpired(now);

  const mapKey = [limit, windowMs, normalizedKey(key)].join(':');
  const entry = rateLimitMap.get(mapKey);
  if (!entry || entry.expiresAt <= now) {
    rateLimitMap.set(mapKey, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, count: 1 };
  }

  if (entry.count >= limit) return { allowed: false, count: entry.count };
  entry.count += 1;
  return { allowed: true, count: entry.count };
}

/**
 * A bounded local limiter used for inexpensive public API endpoints. Security
 * sensitive attestation endpoints additionally use a shared Firestore limiter.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  return checkRateLimitCount(key, limit, windowMs).allowed;
}
