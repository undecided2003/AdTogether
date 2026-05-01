import { AdModel, AdType, AdTogetherOptions } from './types';

export class AdTogether {
  private static instance: AdTogether;
  private appId?: string;
  private bundleId?: string;
  private allowSelfAds: boolean = true;
  public baseUrl: string = 'https://www.ad-together.org';

  private constructor() {}

  static get shared(): AdTogether {
    if (!AdTogether.instance) {
      AdTogether.instance = new AdTogether();
    }
    return AdTogether.instance;
  }

  static initialize(options: AdTogetherOptions) {
    const sdk = AdTogether.shared;
    sdk.appId = options.apiKey || options.appId;
    
    if (options.bundleId) {
      sdk.bundleId = options.bundleId;
    } else if (typeof window !== 'undefined') {
      sdk.bundleId = window.location.hostname;
    }

    if (options.allowSelfAds !== undefined) {
      sdk.allowSelfAds = options.allowSelfAds;
    }
    
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    } else if (typeof window !== 'undefined') {
      // In browser, default to relative paths if no base URL provided
      sdk.baseUrl = '';
    }
    
    console.log(`AdTogether SDK Initialized with App ID: ${sdk.appId}`);
  }

  assertInitialized() {
    if (!this.appId) {
      console.error('AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.');
      return false;
    }
    return true;
  }

  private lastAdId?: string;

  static async fetchAd(adUnitId: string = 'default', adType?: AdType): Promise<AdModel> {
    if (!AdTogether.shared.assertInitialized()) {
      throw new Error('AdTogether not initialized');
    }

    try {
      const sdk = AdTogether.shared;
      let url = `${sdk.baseUrl}/api/ads/serve?country=global&adUnitId=${adUnitId}&apiKey=${sdk.appId}`;
      if (adType) {
        url += `&adType=${adType}`;
      }
      if (sdk.lastAdId) {
        url += `&exclude=${sdk.lastAdId}`;
      }
      if (sdk.bundleId) {
        url += `&bundleId=${sdk.bundleId}`;
      }
      
      // Pass allowSelfAds and source URL for smart serving
      url += `&allowSelfAds=${sdk.allowSelfAds}`;
      if (typeof window !== 'undefined') {
        url += `&sourceUrl=${encodeURIComponent(window.location.href)}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const ad = await response.json();
        sdk.lastAdId = ad.id;
        return ad;
      } else if (response.status === 401 || response.status === 403) {
        console.error('AdTogether Error: Invalid App ID. Please check your dashboard.');
        throw new Error(`AdTogether Error: Invalid App ID. Status: ${response.status}`);
      }

      throw new Error(`Failed to fetch ad. Status: ${response.status}`);
    } catch (err) {
      throw err;
    }
  }

  static trackImpression(adId: string, token?: string) {
    this.trackEvent('/api/ads/impression', adId, token);
  }

  static trackClick(adId: string, token?: string) {
    this.trackEvent('/api/ads/click', adId, token);
  }

  /**
   * Detect the user's country code from the browser locale.
   * Uses Intl API (most reliable) with navigator.language as fallback.
   * Returns an ISO 3166-1 alpha-2 code like "US", "DE", "JP", or null.
   */
  private static detectCountry(): string | null {
    try {
      // Intl API gives the most reliable region
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const resolved = Intl.DateTimeFormat().resolvedOptions();
        // timeZone is like "America/New_York" — we can map it, but locale is simpler
        if (resolved.locale) {
          const parts = resolved.locale.split('-');
          if (parts.length >= 2) {
            const region = parts[parts.length - 1].toUpperCase();
            if (region.length === 2) return region;
          }
        }
      }
      // Fallback: navigator.language (e.g. "en-US" -> "US")
      if (typeof navigator !== 'undefined' && navigator.language) {
        const parts = navigator.language.split('-');
        if (parts.length >= 2) {
          const region = parts[parts.length - 1].toUpperCase();
          if (region.length === 2) return region;
        }
      }
    } catch (_) {}
    return null;
  }

  private static trackEvent(endpoint: string, adId: string, token?: string) {
    if (!AdTogether.shared.assertInitialized()) return;
    
    fetch(`${AdTogether.shared.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        adId, 
        token, 
        apiKey: AdTogether.shared.appId,
        ...(AdTogether.shared.bundleId ? { bundleId: AdTogether.shared.bundleId } : {}),
        // Send platform and environment to match Flutter SDK
        platform: 'web',
        environment: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' ? 'development' : 'production',
        country: AdTogether.detectCountry(),
      }),
    }).catch(console.error);
  }
}
