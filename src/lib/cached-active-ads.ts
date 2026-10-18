import type { DocumentData, Firestore } from 'firebase-admin/firestore';

export interface CachedActiveAd {
  id: string;
  data: DocumentData;
}

interface ActiveAdsCacheEntry {
  ads: CachedActiveAd[];
  expiresAt: number;
}

let activeAdsCache: ActiveAdsCacheEntry | null = null;
let inflightPromise: Promise<CachedActiveAd[]> | null = null;
const ACTIVE_ADS_CACHE_TTL_MS = 60 * 1000; // 60 seconds
 
/**
 * Fetch all active ads from Firestore with process-local caching and
 * request coalescing (thundering-herd prevention).
 *
 * Serving requests can query active ads hundreds of times per second.
 * Caching active ads for 60s reduces Firestore collection reads by over 99%
 * while ensuring ad status and budget changes reflect immediately on campaign updates
 * via invalidateActiveAdsCache().
 */
export async function getCachedActiveAds(db: Firestore): Promise<CachedActiveAd[]> {
  const now = Date.now();
  if (activeAdsCache && activeAdsCache.expiresAt > now) {
    return activeAdsCache.ads;
  }

  // Prevent multiple concurrent requests from triggering duplicate Firestore queries
  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const adsRef = db.collection('ads');
      const q = adsRef.where('active', '==', true);
      const snapshot = await q.get();

      const ads: CachedActiveAd[] = [];
      snapshot.forEach((doc) => {
        ads.push({
          id: doc.id,
          data: doc.data(),
        });
      });

      activeAdsCache = {
        ads,
        expiresAt: Date.now() + ACTIVE_ADS_CACHE_TTL_MS,
      };

      return ads;
    } catch (error) {
      console.error('Failed to fetch active ads from Firestore:', error);
      // Fallback to stale cache if available
      if (activeAdsCache) {
        return activeAdsCache.ads;
      }
      return [];
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

export function invalidateActiveAdsCache(): void {
  activeAdsCache = null;
}
