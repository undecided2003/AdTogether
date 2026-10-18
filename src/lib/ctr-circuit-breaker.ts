/**
 * Abnormal CTR Circuit Breaker
 *
 * Industry benchmarks:
 * - Banner ads: typical CTR is 0.1% - 0.5% (rarely exceeds 2-3%).
 * - Interstitial ads: typical CTR is 3% - 8% (rarely exceeds 15-20%).
 *
 * When an ad placement or app exhibits an abnormal CTR (>35% for banner, >50% for interstitial)
 * across a statistically significant sample (>= 20 impressions for banner, >= 30 for interstitial),
 * the circuit breaker trips.
 *
 * Non-blocking guarantee:
 * - Real users clicking the ad are NEVER blocked or shown errors. Their navigation
 *   to the advertiser destination URL proceeds immediately in their browser/app.
 * - The click endpoint returns HTTP 200 { success: true, circuitBreaker: true }.
 * - Costly Firestore transaction writes and artificial CTR inflation are safely prevented.
 * - The circuit breaker automatically resets (self-heals) as additional normal impressions
 *   bring the CTR back within normal boundaries.
 */

export const MIN_IMPRESSIONS_FOR_BANNER_CTR = 20;
export const MIN_IMPRESSIONS_FOR_INTERSTITIAL_CTR = 30;
export const MAX_BANNER_CTR = 0.35; // 35%
export const MAX_INTERSTITIAL_CTR = 0.50; // 50%

export interface CircuitBreakerResult {
  tripped: boolean;
  ctr: number;
  impressions: number;
  clicks: number;
  reason?: string;
}

// Bounded in-process cache to avoid repeating calculations during rapid click bursts (30s TTL)
const circuitBreakerCache = new Map<string, { tripped: boolean; expiresAt: number; reason?: string }>();
const CACHE_TTL_MS = 30 * 1000;
const MAX_CACHE_ENTRIES = 2_000;

export function isCircuitBreakerCachedTripped(appId: string, adId: string): boolean {
  if (!appId || !adId) return false;
  const key = `${appId}:${adId}`;
  const entry = circuitBreakerCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.tripped;
  }
  return false;
}

export function checkCtrCircuitBreaker(params: {
  appId: string;
  adId: string;
  adType?: 'banner' | 'interstitial';
  earningsLog?: Record<string, any>;
  dailyImpressionsByApp?: Record<string, Record<string, number>>;
  dailyClicksByApp?: Record<string, Record<string, number>>;
}): CircuitBreakerResult {
  const { appId, adId, adType = 'banner', earningsLog, dailyImpressionsByApp, dailyClicksByApp } = params;

  const minImpressions = adType === 'interstitial'
    ? MIN_IMPRESSIONS_FOR_INTERSTITIAL_CTR
    : MIN_IMPRESSIONS_FOR_BANNER_CTR;
  const maxCtr = adType === 'interstitial' ? MAX_INTERSTITIAL_CTR : MAX_BANNER_CTR;

  // Prune cache if full
  if (circuitBreakerCache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of circuitBreakerCache) {
      if (v.expiresAt <= now) circuitBreakerCache.delete(k);
    }
  }

  // 1. Check placement-specific lifetime stats from earningsLog
  if (earningsLog) {
    const logKey = appId ? `${appId}_${adId}` : adId;
    const entry = earningsLog[logKey] || earningsLog[adId];
    if (entry && typeof entry.impressions === 'number' && entry.impressions >= minImpressions) {
      const impressions = entry.impressions;
      const clicks = typeof entry.clicks === 'number' ? entry.clicks : 0;
      const ctr = clicks / impressions;
      if (ctr > maxCtr) {
        const reason = `placement_ctr_exceeded_${(ctr * 100).toFixed(1)}%`;
        circuitBreakerCache.set(`${appId}:${adId}`, { tripped: true, expiresAt: Date.now() + CACHE_TTL_MS, reason });
        return {
          tripped: true,
          ctr,
          impressions,
          clicks,
          reason,
        };
      }
    }
  }

  // 2. Check today's app-level stats from daily tracking
  if (dailyImpressionsByApp && dailyClicksByApp && appId) {
    const today = new Date().toISOString().split('T')[0];
    const todayImpressions = dailyImpressionsByApp[appId]?.[today] || 0;
    const todayClicks = dailyClicksByApp[appId]?.[today] || 0;

    if (todayImpressions >= minImpressions) {
      const todayCtr = todayClicks / todayImpressions;
      if (todayCtr > maxCtr) {
        const reason = `daily_app_ctr_exceeded_${(todayCtr * 100).toFixed(1)}%`;
        circuitBreakerCache.set(`${appId}:${adId}`, { tripped: true, expiresAt: Date.now() + CACHE_TTL_MS, reason });
        return {
          tripped: true,
          ctr: todayCtr,
          impressions: todayImpressions,
          clicks: todayClicks,
          reason,
        };
      }
    }
  }

  circuitBreakerCache.set(`${appId}:${adId}`, { tripped: false, expiresAt: Date.now() + CACHE_TTL_MS });
  return { tripped: false, ctr: 0, impressions: 0, clicks: 0 };
}
