import { AdModel, AdType, AdTogetherOptions, ViewabilityMetrics } from './types';
import { NativeModules, Platform } from 'react-native';

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

  /**
   * Attempts to auto-detect the app's bundle/package identifier.
   * Tries multiple sources in order:
   * 1. expo-application (if Expo is available)
   * 2. react-native-device-info (if installed)
   * 3. RN's built-in PlatformConstants (Android only)
   */
  private static tryAutoDetectBundleId(): string | undefined {
    // 1. Try expo-application (works in Expo and bare RN with expo modules)
    try {
      const ExpoApplication = require('expo-application');
      if (ExpoApplication?.applicationId) {
        return ExpoApplication.applicationId;
      }
    } catch (_) {
      // expo-application not available
    }

    // 2. Try react-native-device-info (popular community module)
    try {
      const DeviceInfo = require('react-native-device-info');
      if (DeviceInfo?.getBundleId) {
        return DeviceInfo.getBundleId();
      }
    } catch (_) {
      // react-native-device-info not available
    }

    // 3. Try RN's built-in PlatformConstants (Android exposes package name)
    try {
      if (Platform.OS === 'android') {
        const constants = NativeModules.PlatformConstants;
        if (constants?.reactNativeVersion) {
          // On Android, the ServerHost module sometimes exposes the package name
          const appModule = NativeModules.RNDeviceInfo || NativeModules.AppInfo;
          if (appModule?.bundleId) {
            return appModule.bundleId;
          }
        }
      }
    } catch (_) {
      // PlatformConstants not available
    }

    return undefined;
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
    } else {
      // Auto-detect bundleId from available native modules
      sdk.bundleId = AdTogether.tryAutoDetectBundleId();
      if (!sdk.bundleId) {
        console.warn(
          'AdTogether: Could not auto-detect bundleId. ' +
          'For best results, provide bundleId in initialize() options, ' +
          'or install expo-application or react-native-device-info.'
        );
      }
    }

    if (options.allowSelfAds !== undefined) {
      sdk.allowSelfAds = options.allowSelfAds;
    }
    
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    }
    
    console.log(`AdTogether SDK Initialized with App ID: ${sdk.appId}${sdk.bundleId ? `, Bundle ID: ${sdk.bundleId}` : ''}`);
  }

  assertInitialized() {
    if (!this.appId) {
      console.error('AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.');
      return false;
    }
    return true;
  }

  private lastAdId?: string;
  private static adCache: Map<string, { ad: AdModel; expiresAt: number }> = new Map();
  private static inflightRequests: Map<string, Promise<AdModel>> = new Map();
  private static readonly AD_CACHE_TTL_MS = 15 * 1000; // 15 seconds
  private static clickedTokens: Set<string> = new Set();

  private static getCacheKey(adUnitId: string, adType?: AdType): string {
    return `${adType || 'banner'}:${adUnitId}`;
  }

  static clearAdCache(): void {
    AdTogether.adCache.clear();
  }

  static async fetchAd(adUnitId: string = 'default', adType?: AdType): Promise<AdModel> {
    if (!AdTogether.shared.assertInitialized()) {
      throw new Error('AdTogether not initialized');
    }

    const cacheKey = AdTogether.getCacheKey(adUnitId, adType);
    const now = Date.now();
    const cached = AdTogether.adCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      AdTogether.shared.lastAdId = cached.ad.id;
      return cached.ad;
    }
    AdTogether.adCache.delete(cacheKey);

    const inflight = AdTogether.inflightRequests.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const fetchPromise = (async () => {
      try {
        const sdk = AdTogether.shared;
        const url = AdTogether.buildServeUrl(sdk, adUnitId, adType);

        const response = await fetch(url);
        if (response.ok) {
          const ad = await response.json() as AdModel;
          if (adType && ad.adType !== adType) {
            throw new Error('Received an ad with a different type than requested: ' + (ad.adType ?? 'missing'));
          }
          AdTogether.adCache.set(cacheKey, {
            ad,
            expiresAt: Date.now() + AdTogether.AD_CACHE_TTL_MS,
          });
          sdk.lastAdId = ad.id;
          return ad;
        } else if (response.status === 401 || response.status === 403) {
          console.error('AdTogether Error: Invalid App ID. Please check your dashboard.');
          throw new Error(`AdTogether Error: Invalid App ID. Status: ${response.status}`);
        }

        throw new Error(`Failed to fetch ad. Status: ${response.status}`);
      } finally {
        AdTogether.inflightRequests.delete(cacheKey);
      }
    })();

    AdTogether.inflightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private static buildServeUrl(sdk: AdTogether, adUnitId: string, adType?: AdType): string {
    const url = new URL(sdk.baseUrl);
    url.pathname = url.pathname.replace(/\/+$/, '') + '/api/ads/serve';
    url.search = '';
    url.hash = '';

    url.searchParams.set('adUnitId', adUnitId);
    url.searchParams.set('appId', sdk.appId ?? '');
    url.searchParams.set('allowSelfAds', String(sdk.allowSelfAds));
    url.searchParams.set('platform', Platform.OS);
    if (adType) {
      url.searchParams.set('adType', adType);
    }
    if (sdk.lastAdId) {
      url.searchParams.set('exclude', sdk.lastAdId);
    }
    if (sdk.bundleId) {
      url.searchParams.set('bundleId', sdk.bundleId);
    }

    return url.toString();
  }

  static trackImpression(adId: string, token?: string, viewability?: ViewabilityMetrics) {
    this.trackEvent('/api/ads/impression', adId, token, viewability);
  }

  static trackClick(adId: string, token?: string) {
    if (token) {
      if (this.clickedTokens.has(token)) return;
      this.clickedTokens.add(token);
      if (this.clickedTokens.size > 200) {
        const oldest = this.clickedTokens.values().next().value;
        if (oldest) this.clickedTokens.delete(oldest);
      }
    }
    this.trackEvent('/api/ads/click', adId, token);
  }

  private static trackEvent(
    endpoint: string,
    adId: string,
    token?: string,
    viewability?: ViewabilityMetrics
  ) {
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
        // Send platform and environment to match Flutter SDK
        platform: Platform.OS,
        environment: __DEV__ ? 'development' : 'production',
        ...(viewability ? viewability : {}),
      }),
    }).catch(console.error);
  }
}
