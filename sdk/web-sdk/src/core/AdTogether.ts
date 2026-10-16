import { AdModel, AdType, AdTogetherOptions, ViewabilityMetrics } from './types';

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
    
    if (options.apiKey && !options.appId) {
      console.warn('AdTogether: "apiKey" is deprecated. Please use "appId" instead.');
      sdk.appId = options.apiKey;
    } else {
      sdk.appId = options.appId;
    }
    
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
      const url = AdTogether.buildServeUrl(sdk, adUnitId, adType);

      const response = await fetch(url);
      if (response.ok) {
        const ad = await response.json() as AdModel;
        if (adType && ad.adType !== adType) {
          throw new Error('Received an ad with a different type than requested: ' + (ad.adType ?? 'missing'));
        }
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

  private static buildServeUrl(sdk: AdTogether, adUnitId: string, adType?: AdType): string {
    const fallbackBaseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://www.ad-together.org';
    const url = new URL(sdk.baseUrl || fallbackBaseUrl, fallbackBaseUrl);
    url.pathname = url.pathname.replace(/\/+$/, '') + '/api/ads/serve';
    url.search = '';
    url.hash = '';

    url.searchParams.set('adUnitId', adUnitId);
    url.searchParams.set('appId', sdk.appId ?? '');
    url.searchParams.set('allowSelfAds', String(sdk.allowSelfAds));
    url.searchParams.set('platform', 'web');
    if (adType) {
      url.searchParams.set('adType', adType);
    }
    if (sdk.lastAdId) {
      url.searchParams.set('exclude', sdk.lastAdId);
    }
    if (sdk.bundleId) {
      url.searchParams.set('bundleId', sdk.bundleId);
    }
    if (typeof window !== 'undefined') {
      url.searchParams.set('sourceUrl', window.location.href);
    }

    return url.toString();
  }

  static trackImpression(adId: string, token?: string, viewability?: ViewabilityMetrics) {
    this.trackEvent('/api/ads/impression', adId, token, viewability);
  }

  static trackClick(adId: string, token?: string) {
    this.trackEvent('/api/ads/click', adId, token);
  }

  private static trackEvent(endpoint: string, adId: string, token?: string, viewability?: ViewabilityMetrics) {
    if (!AdTogether.shared.assertInitialized()) return;
    
    fetch(`${AdTogether.shared.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        adId, 
        token, 
        appId: AdTogether.shared.appId,
        ...(AdTogether.shared.bundleId ? { bundleId: AdTogether.shared.bundleId } : {}),
        ...(endpoint === '/api/ads/impression' && typeof window !== 'undefined'
          ? { pagePath: window.location.pathname }
          : {}),
        ...(endpoint === '/api/ads/impression' && viewability ? viewability : {}),
        // Send platform and environment to match Flutter SDK
        platform: 'web',
        environment: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' ? 'development' : 'production',
      }),
    }).catch(console.error);
  }
}
