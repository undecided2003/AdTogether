"use strict";

import { Platform } from 'react-native';
export class AdTogether {
  allowSelfAds = true;
  baseUrl = 'https://adtogether.relaxsoftwareapps.com';
  constructor() {}
  static get shared() {
    if (!AdTogether.instance) {
      AdTogether.instance = new AdTogether();
    }
    return AdTogether.instance;
  }
  static initialize(options) {
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
  static async fetchAd(adUnitId, adType) {
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
  static trackImpression(adId, token) {
    this.trackEvent('/api/ads/impression', adId, token);
  }
  static trackClick(adId, token) {
    this.trackEvent('/api/ads/click', adId, token);
  }
  static trackEvent(endpoint, adId, token) {
    if (!AdTogether.shared.assertInitialized()) return;
    fetch(`${AdTogether.shared.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adId,
        token,
        apiKey: AdTogether.shared.appId
      })
    }).catch(console.error);
  }
}
//# sourceMappingURL=AdTogether.js.map