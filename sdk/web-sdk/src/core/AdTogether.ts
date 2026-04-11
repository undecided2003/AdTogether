import { AdModel, AdTogetherOptions } from './types';

export class AdTogether {
  private static instance: AdTogether;
  private appId?: string;
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
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    }
    console.log(`AdTogether SDK Initialized with Key/ID: ${sdk.appId}`);
  }

  assertInitialized() {
    if (!this.appId) {
      console.error('AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.');
      return false;
    }
    return true;
  }

  static async fetchAd(adUnitId: string): Promise<AdModel> {
    if (!AdTogether.shared.assertInitialized()) {
      throw new Error('AdTogether not initialized');
    }

    const response = await fetch(`${AdTogether.shared.baseUrl}/api/ads/serve?country=global&adUnitId=${adUnitId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ad. Status: ${response.status}`);
    }
    return response.json();
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
      body: JSON.stringify({ adId, token }),
    }).catch(console.error);
  }
}
