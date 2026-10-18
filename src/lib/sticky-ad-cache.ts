import { createHash } from 'node:crypto';

const MAX_ENTRIES = 10_000;
const DEFAULT_STICKY_TTL_MS = 15_000; // 15 seconds minimum banner persistence

interface StickyAdEntry {
  payload: any;
  token: string;
  expiresAt: number;
}

const stickyAdMap = new Map<string, StickyAdEntry>();
const tokenToKeyMap = new Map<string, string>();
let cleanupCounter = 0;

function pruneExpired(now: number) {
  for (const [key, entry] of stickyAdMap) {
    if (entry.expiresAt <= now) {
      stickyAdMap.delete(key);
      tokenToKeyMap.delete(entry.token);
    }
  }
  while (stickyAdMap.size >= MAX_ENTRIES) {
    const oldestKey = stickyAdMap.keys().next().value;
    if (!oldestKey) break;
    const entry = stickyAdMap.get(oldestKey);
    if (entry) tokenToKeyMap.delete(entry.token);
    stickyAdMap.delete(oldestKey);
  }
}

/**
 * Generate a deterministic sticky cache key binding the App ID, ad placement unit,
 * client IP, and browser/device fingerprint so distinct devices behind a shared
 * NAT or Wi-Fi have separate sticky slots.
 */
export function getStickyAdCacheKey(
  appId: string,
  clientIp: string,
  adUnitId?: string | null,
  userAgent?: string | null
): string {
  const safeIp = (clientIp || 'unknown_ip').trim();
  const safeAppId = (appId || 'unknown_app').trim();
  const safeUnitId = (adUnitId || 'default').trim();
  const uaHash = createHash('sha256')
    .update(userAgent || '')
    .digest('hex')
    .slice(0, 16);

  return `${safeAppId}:${safeUnitId}:${safeIp}:${uaHash}`;
}

/**
 * Retrieve a fresh sticky banner ad response if one was served recently to this client.
 * Returns null if no cached ad exists or if the TTL has expired.
 */
export function getStickyServedAd(key: string, now: number = Date.now()): any | null {
  const entry = stickyAdMap.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    stickyAdMap.delete(key);
    tokenToKeyMap.delete(entry.token);
    return null;
  }
  return entry.payload;
}

/**
 * Store a served banner ad response in the sticky cache for the configured duration.
 */
export function setStickyServedAd(
  key: string,
  payload: any,
  token: string,
  ttlMs: number = DEFAULT_STICKY_TTL_MS,
  now: number = Date.now()
): void {
  if (++cleanupCounter % 128 === 0 || stickyAdMap.size >= MAX_ENTRIES) {
    pruneExpired(now);
  }

  // Replace any existing token mapping for this key
  const existing = stickyAdMap.get(key);
  if (existing) {
    tokenToKeyMap.delete(existing.token);
  }

  const expiresAt = now + ttlMs;
  stickyAdMap.set(key, { payload, token, expiresAt });
  if (token) {
    tokenToKeyMap.set(token, key);
  }
}

/**
 * Invalidate a sticky cached ad once its impression has been successfully credited.
 * This frees the client to immediately fetch a fresh ad on their next request.
 */
export function invalidateStickyAdByToken(token: string): boolean {
  if (!token) return false;
  const key = tokenToKeyMap.get(token);
  if (!key) return false;
  tokenToKeyMap.delete(token);
  stickyAdMap.delete(key);
  return true;
}

/**
 * Reset all sticky ad entries (used primarily in tests).
 */
export function clearStickyAdCache(): void {
  stickyAdMap.clear();
  tokenToKeyMap.clear();
}
