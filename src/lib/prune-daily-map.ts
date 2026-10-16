/**
 * Prune daily-keyed maps to keep only the last N days of data.
 * Prevents Firestore documents from growing unbounded over time.
 */

const TWO_YEARS_MS = 730 * 24 * 60 * 60 * 1000;

/**
 * Removes entries older than 2 years from a flat daily map.
 * Map shape: { "2026-10-05": number, ... }
 * Mutates and returns the map for convenience.
 */
export function pruneDailyMap(map?: Record<string, number> | null): Record<string, number> {
  if (!map || typeof map !== 'object') return {};
  const cutoff = new Date(Date.now() - TWO_YEARS_MS);
  for (const dateStr of Object.keys(map)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d < cutoff) {
      delete map[dateStr];
    }
  }
  return map;
}

/**
 * Removes entries older than 2 years from a per-app daily map.
 * Map shape: { [appId]: { "2026-10-05": number, ... } }
 * Also removes app keys that become empty after pruning.
 * Mutates and returns the map for convenience.
 */
export function pruneDailyMapByApp(map?: Record<string, Record<string, number>> | null): Record<string, Record<string, number>> {
  if (!map || typeof map !== 'object') return {};
  const cutoff = new Date(Date.now() - TWO_YEARS_MS);
  for (const appKey of Object.keys(map)) {
    const appMap = map[appKey];
    if (!appMap || typeof appMap !== 'object') continue;
    for (const dateStr of Object.keys(appMap)) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime()) && d < cutoff) {
        delete appMap[dateStr];
      }
    }
    // Clean up empty app entries
    if (Object.keys(appMap).length === 0) {
      delete map[appKey];
    }
  }
  return map;
}
