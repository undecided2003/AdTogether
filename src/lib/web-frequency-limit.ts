/**
 * Web-Only Frequency Limiter (Option B: In-Memory Server-Side & Option C: Upstash Edge Redis)
 *
 * Enforces rolling hourly (default: 3) and daily (default: 12) view limits per client IP
 * for web traffic with zero Firestore read/write overhead.
 */

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_IP_ENTRIES = 20_000;

let cleanupCounter = 0;

export interface WebFrequencyLimitResult {
  allowed: boolean;
  reason?: 'hourly_limit_reached' | 'daily_limit_reached';
  hourlyCount: number;
  dailyCount: number;
  maxPerHour: number;
  maxPerDay: number;
  retryAfterSeconds?: number;
}

// In-Memory Storage (Option B)
const impressionTimestampsByIp = new Map<string, number[]>();
const serveTimestampsByIp = new Map<string, number[]>();

function getConfiguredLimits() {
  const envHourly = Number(process.env.WEB_MAX_VIEWS_PER_HOUR);
  const envDaily = Number(process.env.WEB_MAX_VIEWS_PER_DAY);
  const enabled = process.env.ENABLE_WEB_FREQUENCY_LIMIT !== 'false';

  const maxPerHour = Number.isFinite(envHourly) && envHourly > 0 ? envHourly : 3;
  const maxPerDay = Number.isFinite(envDaily) && envDaily > 0 ? envDaily : 12;

  return { enabled, maxPerHour, maxPerDay };
}

function pruneMap(map: Map<string, number[]>, now: number) {
  const oneDayAgo = now - ONE_DAY_MS;

  for (const [ip, timestamps] of map) {
    const valid = timestamps.filter((t) => t > oneDayAgo);
    if (valid.length === 0) {
      map.delete(ip);
    } else if (valid.length !== timestamps.length) {
      map.set(ip, valid);
    }
  }

  while (map.size >= MAX_IP_ENTRIES) {
    const oldest = map.keys().next().value;
    if (!oldest) break;
    map.delete(oldest);
  }
}

function checkInMemoryLimit(
  map: Map<string, number[]>,
  clientIp: string,
  maxPerHour: number,
  maxPerDay: number,
  now: number = Date.now()
): WebFrequencyLimitResult {
  if (++cleanupCounter % 128 === 0 || map.size >= MAX_IP_ENTRIES) {
    pruneMap(map, now);
  }

  const normalizedIp = clientIp.trim();
  const timestamps = map.get(normalizedIp) || [];
  const oneHourAgo = now - ONE_HOUR_MS;
  const oneDayAgo = now - ONE_DAY_MS;

  const validTimestamps = timestamps.filter((t) => t > oneDayAgo);
  const hourlyCount = validTimestamps.filter((t) => t > oneHourAgo).length;
  const dailyCount = validTimestamps.length;

  if (maxPerHour > 0 && hourlyCount >= maxPerHour) {
    const oldestInHour = validTimestamps.filter((t) => t > oneHourAgo)[0] || now;
    const retryAfter = Math.max(1, Math.ceil((oldestInHour + ONE_HOUR_MS - now) / 1000));
    return {
      allowed: false,
      reason: 'hourly_limit_reached',
      hourlyCount,
      dailyCount,
      maxPerHour,
      maxPerDay,
      retryAfterSeconds: retryAfter,
    };
  }

  if (maxPerDay > 0 && dailyCount >= maxPerDay) {
    const oldestInDay = validTimestamps[0] || now;
    const retryAfter = Math.max(1, Math.ceil((oldestInDay + ONE_DAY_MS - now) / 1000));
    return {
      allowed: false,
      reason: 'daily_limit_reached',
      hourlyCount,
      dailyCount,
      maxPerHour,
      maxPerDay,
      retryAfterSeconds: retryAfter,
    };
  }

  return {
    allowed: true,
    hourlyCount,
    dailyCount,
    maxPerHour,
    maxPerDay,
  };
}

function recordInMemory(map: Map<string, number[]>, clientIp: string, now: number = Date.now()): void {
  const normalizedIp = clientIp.trim();
  const timestamps = map.get(normalizedIp) || [];
  const oneDayAgo = now - ONE_DAY_MS;
  const valid = timestamps.filter((t) => t > oneDayAgo);
  valid.push(now);
  map.set(normalizedIp, valid);
}

// ----------------------------------------------------------------------------
// Option C: Distributed Edge / Upstash Redis Limiter
// ----------------------------------------------------------------------------

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return { url, token };
  }
  return null;
}

/**
 * Check and increment rolling limits via Upstash Redis REST API (Zero Dependencies).
 */
async function checkUpstashLimit(
  scope: 'impression' | 'serve',
  clientIp: string,
  maxPerHour: number,
  maxPerDay: number,
  now: number = Date.now()
): Promise<WebFrequencyLimitResult | null> {
  const upstash = getUpstashConfig();
  if (!upstash) return null;

  const hourKey = `web_fc:${scope}:hour:${clientIp}`;
  const dayKey = `web_fc:${scope}:day:${clientIp}`;

  const oneHourAgo = now - ONE_HOUR_MS;
  const oneDayAgo = now - ONE_DAY_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s safety timeout

  try {
    // Pipeline atomic query of sorted sets for both hour and day
    const response = await fetch(`${upstash.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstash.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['ZREMRANGEBYSCORE', hourKey, '0', String(oneHourAgo)],
        ['ZCARD', hourKey],
        ['ZREMRANGEBYSCORE', dayKey, '0', String(oneDayAgo)],
        ['ZCARD', dayKey],
      ]),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length < 4) return null;

    const hourlyCount = Number(data[1]?.result) || 0;
    const dailyCount = Number(data[3]?.result) || 0;

    if (maxPerHour > 0 && hourlyCount >= maxPerHour) {
      return {
        allowed: false,
        reason: 'hourly_limit_reached',
        hourlyCount,
        dailyCount,
        maxPerHour,
        maxPerDay,
        retryAfterSeconds: 3600,
      };
    }

    if (maxPerDay > 0 && dailyCount >= maxPerDay) {
      return {
        allowed: false,
        reason: 'daily_limit_reached',
        hourlyCount,
        dailyCount,
        maxPerHour,
        maxPerDay,
        retryAfterSeconds: 86400,
      };
    }

    return {
      allowed: true,
      hourlyCount,
      dailyCount,
      maxPerHour,
      maxPerDay,
    };
  } catch (error) {
    console.warn('Upstash frequency limit check error, falling back to local limiter:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function recordUpstash(
  scope: 'impression' | 'serve',
  clientIp: string,
  now: number = Date.now()
): Promise<void> {
  const upstash = getUpstashConfig();
  if (!upstash) return;

  const hourKey = `web_fc:${scope}:hour:${clientIp}`;
  const dayKey = `web_fc:${scope}:day:${clientIp}`;
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000);

  try {
    await fetch(`${upstash.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstash.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['ZADD', hourKey, String(now), member],
        ['EXPIRE', hourKey, '7200'],
        ['ZADD', dayKey, String(now), member],
        ['EXPIRE', dayKey, '172800'],
      ]),
      signal: controller.signal,
    });
  } catch {
    // Ignore remote write failure; in-memory fallback already recorded
  } finally {
    clearTimeout(timeoutId);
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Check whether a web client IP is allowed to view/record an impression.
 * Evaluates Upstash Redis (Option C) if configured, with in-memory fallback (Option B).
 */
export async function checkWebImpressionFrequencyLimit(
  clientIp: string,
  now: number = Date.now()
): Promise<WebFrequencyLimitResult> {
  const { enabled, maxPerHour, maxPerDay } = getConfiguredLimits();
  if (!enabled) {
    return { allowed: true, hourlyCount: 0, dailyCount: 0, maxPerHour, maxPerDay };
  }

  // 1. Try Upstash Distributed Edge Limiter (Option C)
  const upstashResult = await checkUpstashLimit('impression', clientIp, maxPerHour, maxPerDay, now);
  if (upstashResult) {
    return upstashResult;
  }

  // 2. In-Memory Process-Local Limiter (Option B)
  return checkInMemoryLimit(impressionTimestampsByIp, clientIp, maxPerHour, maxPerDay, now);
}

/**
 * Check whether a web client IP is allowed to request/serve a new ad.
 * Allows a small buffer above impression limits (maxPerHour + 1, maxPerDay + 2)
 * to handle render lifecycles while blocking automated ad-scraping burst loops.
 */
export async function checkWebServeFrequencyLimit(
  clientIp: string,
  now: number = Date.now()
): Promise<WebFrequencyLimitResult> {
  const { enabled, maxPerHour, maxPerDay } = getConfiguredLimits();
  if (!enabled) {
    return { allowed: true, hourlyCount: 0, dailyCount: 0, maxPerHour, maxPerDay };
  }

  // Also check if impression limit is already maxed out
  const impressionCheck = await checkWebImpressionFrequencyLimit(clientIp, now);
  if (!impressionCheck.allowed) {
    return impressionCheck;
  }

  const maxServePerHour = maxPerHour + 1;
  const maxServePerDay = maxPerDay + 2;

  // 1. Try Upstash (Option C)
  const upstashResult = await checkUpstashLimit('serve', clientIp, maxServePerHour, maxServePerDay, now);
  if (upstashResult) {
    return upstashResult;
  }

  // 2. In-Memory Process-Local Limiter (Option B)
  return checkInMemoryLimit(serveTimestampsByIp, clientIp, maxServePerHour, maxServePerDay, now);
}

/**
 * Record a verified web impression.
 */
export async function recordWebImpression(clientIp: string, now: number = Date.now()): Promise<void> {
  const { enabled } = getConfiguredLimits();
  if (!enabled) return;

  recordInMemory(impressionTimestampsByIp, clientIp, now);
  await recordUpstash('impression', clientIp, now);
}

/**
 * Record a served web ad creative.
 */
export async function recordWebServe(clientIp: string, now: number = Date.now()): Promise<void> {
  const { enabled } = getConfiguredLimits();
  if (!enabled) return;

  recordInMemory(serveTimestampsByIp, clientIp, now);
  await recordUpstash('serve', clientIp, now);
}

/**
 * Reset all in-memory limits (for testing purposes).
 */
export function resetWebFrequencyLimits(): void {
  impressionTimestampsByIp.clear();
  serveTimestampsByIp.clear();
}
