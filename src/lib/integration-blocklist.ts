/**
 * Temporary integration blocklist.
 *
 * Publishers listed here are refused at the public ad endpoints (HTTP 426)
 * before any database work, so a legacy/broken SDK cannot keep consuming
 * function invocations, impression-chain traffic, or advertiser credits.
 *
 * WHY the current entry is blocked:
 * at_b991ba446d35494181a72f33624a1071 (hellomarket.com) runs an integration
 * pinned before commit 59cbf5a (text/plain CORS bypass): every impression
 * forces a browser OPTIONS preflight, and their pages' render-time ad fetches
 * (fired for every Googlebot render of their marketplace listings) generate
 * ~85% of this project's total function traffic.
 *
 * HOW TO UNBLOCK: remove the entry here (or adjust BLOCKED_APP_IDS) and run
 * `npm run deploy`. Blocking is instant and fully reversible.
 *
 * `BLOCKED_APP_IDS` (comma-separated, set in .env.local) extends the list at
 * deploy time without code changes.
 */
const HARDCODED_BLOCKED_APP_IDS: readonly string[] = [
  'at_b991ba446d35494181a72f33624a1071',
];

const envBlockedAppIds = (process.env.BLOCKED_APP_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const blockedAppIds = new Set<string>([...HARDCODED_BLOCKED_APP_IDS, ...envBlockedAppIds]);

/** True when an App ID's integration is temporarily refused at public ad endpoints. */
export function isIntegrationBlocked(appId: string | null | undefined): boolean {
  return Boolean(appId && blockedAppIds.has(appId));
}

/** Response body/headers for a blocked integration (loud enough to notice in any SDK logs). */
export const INTEGRATION_BLOCKED_RESPONSE = {
  status: 426,
  body: {
    error: 'integration_upgrade_required',
    message:
      'This AdTogether SDK version is no longer supported. Please upgrade to the latest SDK from https://www.ad-together.org/docs',
  },
} as const;
