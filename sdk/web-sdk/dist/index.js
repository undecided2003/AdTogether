"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AdTogether: () => AdTogether
});
module.exports = __toCommonJS(index_exports);

// src/core/AdTogether.ts
var AdTogether = class _AdTogether {
  constructor() {
    this.allowSelfAds = true;
    this.baseUrl = "https://adtogether.relaxsoftwareapps.com";
  }
  static get shared() {
    if (!_AdTogether.instance) {
      _AdTogether.instance = new _AdTogether();
    }
    return _AdTogether.instance;
  }
  static initialize(options) {
    const sdk = _AdTogether.shared;
    sdk.appId = options.apiKey || options.appId;
    if (options.bundleId) {
      sdk.bundleId = options.bundleId;
    } else if (typeof window !== "undefined") {
      sdk.bundleId = window.location.hostname;
    }
    if (options.allowSelfAds !== void 0) {
      sdk.allowSelfAds = options.allowSelfAds;
    }
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    } else if (typeof window !== "undefined") {
      sdk.baseUrl = "";
    }
    console.log(`AdTogether SDK Initialized with App ID: ${sdk.appId}`);
  }
  assertInitialized() {
    if (!this.appId) {
      console.error("AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.");
      return false;
    }
    return true;
  }
  static async fetchAd(adUnitId, adType) {
    if (!_AdTogether.shared.assertInitialized()) {
      throw new Error("AdTogether not initialized");
    }
    try {
      const sdk = _AdTogether.shared;
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
      url += `&allowSelfAds=${sdk.allowSelfAds}`;
      if (typeof window !== "undefined") {
        url += `&sourceUrl=${encodeURIComponent(window.location.href)}`;
      }
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
    this.trackEvent("/api/ads/impression", adId, token);
  }
  static trackClick(adId, token) {
    this.trackEvent("/api/ads/click", adId, token);
  }
  /**
   * Detect the user's country code from the browser locale.
   * Uses Intl API (most reliable) with navigator.language as fallback.
   * Returns an ISO 3166-1 alpha-2 code like "US", "DE", "JP", or null.
   */
  static detectCountry() {
    try {
      if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
        const resolved = Intl.DateTimeFormat().resolvedOptions();
        if (resolved.locale) {
          const parts = resolved.locale.split("-");
          if (parts.length >= 2) {
            const region = parts[parts.length - 1].toUpperCase();
            if (region.length === 2) return region;
          }
        }
      }
      if (typeof navigator !== "undefined" && navigator.language) {
        const parts = navigator.language.split("-");
        if (parts.length >= 2) {
          const region = parts[parts.length - 1].toUpperCase();
          if (region.length === 2) return region;
        }
      }
    } catch (_) {
    }
    return null;
  }
  static trackEvent(endpoint, adId, token) {
    if (!_AdTogether.shared.assertInitialized()) return;
    fetch(`${_AdTogether.shared.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adId,
        token,
        apiKey: _AdTogether.shared.appId,
        ..._AdTogether.shared.bundleId ? { bundleId: _AdTogether.shared.bundleId } : {},
        // Send platform and environment to match Flutter SDK
        platform: "web",
        environment: typeof process !== "undefined" && process.env?.NODE_ENV === "development" ? "development" : "production",
        country: _AdTogether.detectCountry()
      })
    }).catch(console.error);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdTogether
});
