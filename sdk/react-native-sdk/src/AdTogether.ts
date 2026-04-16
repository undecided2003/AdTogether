import { AdModel, AdType, AdTogetherOptions } from './types';
import { Platform } from 'react-native';

export class AdTogether {
  private static instance: AdTogether;
  private appId?: string;
  private allowSelfAds: boolean = true;
  public baseUrl: string = 'https://adtogether.relaxsoftwareapps.com';

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
    
    if (options.allowSelfAds !== undefined) {
      sdk.allowSelfAds = options.allowSelfAds;
    }
    
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
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

  static async fetchAd(adUnitId: string, adType?: AdType): Promise<AdModel> {
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
      
      // Pass allowSelfAds
      url += `&allowSelfAds=${sdk.allowSelfAds}&platform=${Platform.OS}`;

      const response = await fetch(url);
      if (response.ok) {
        const ad = await response.json();
        sdk.lastAdId = ad.id;
        return ad;
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
        apiKey: AdTogether.shared.appId 
      }),
    }).catch(console.error);
  }
}
