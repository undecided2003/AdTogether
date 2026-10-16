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

/**
 * A bounded local limiter used for inexpensive public API endpoints. Security
 * sensitive attestation endpoints additionally use a shared Firestore limiter.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (++cleanupCounter % 128 === 0 || rateLimitMap.size >= MAX_ENTRIES) pruneExpired(now);

  const mapKey = [limit, windowMs, normalizedKey(key)].join(':');
  const entry = rateLimitMap.get(mapKey);
  if (!entry || entry.expiresAt <= now) {
    rateLimitMap.set(mapKey, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
