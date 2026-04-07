// src/core/AdTogether.ts
var AdTogether = class _AdTogether {
  constructor() {
    this.baseUrl = "https://adtogether.com";
  }
  static get shared() {
    if (!_AdTogether.instance) {
      _AdTogether.instance = new _AdTogether();
    }
    return _AdTogether.instance;
  }
  static initialize(options) {
    const sdk = _AdTogether.shared;
    sdk.appId = options.appId;
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    }
    console.log(`AdTogether SDK Initialized with App ID: ${options.appId}`);
  }
  assertInitialized() {
    if (!this.appId) {
      console.error("AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.");
      return false;
    }
    return true;
  }
  static async fetchAd(adUnitId) {
    if (!_AdTogether.shared.assertInitialized()) {
      throw new Error("AdTogether not initialized");
    }
    const response = await fetch(`${_AdTogether.shared.baseUrl}/api/ads/serve?country=global&adUnitId=${adUnitId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ad. Status: ${response.status}`);
    }
    return response.json();
  }
  static trackImpression(adId) {
    this.trackEvent("/api/ads/impression", adId);
  }
  static trackClick(adId) {
    this.trackEvent("/api/ads/click", adId);
  }
  static trackEvent(endpoint, adId) {
    if (!_AdTogether.shared.assertInitialized()) return;
    fetch(`${_AdTogether.shared.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ adId })
    }).catch(console.error);
  }
};

export {
  AdTogether
};
