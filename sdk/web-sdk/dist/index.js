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
    this.baseUrl = "https://www.ad-together.org";
  }
  static get shared() {
    if (!_AdTogether.instance) {
      _AdTogether.instance = new _AdTogether();
    }
    return _AdTogether.instance;
  }
  static initialize(options) {
    const sdk = _AdTogether.shared;
    if (options.apiKey && !options.appId) {
      console.warn('AdTogether: "apiKey" is deprecated. Please use "appId" instead.');
      sdk.appId = options.apiKey;
    } else {
      sdk.appId = options.appId;
    }
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
  static async fetchAd(adUnitId = "default", adType) {
    if (!_AdTogether.shared.assertInitialized()) {
      throw new Error("AdTogether not initialized");
    }
    try {
      const sdk = _AdTogether.shared;
      const url = _AdTogether.buildServeUrl(sdk, adUnitId, adType);
      const response = await fetch(url);
      if (response.ok) {
        const ad = await response.json();
        if (adType && ad.adType !== adType) {
          throw new Error("Received an ad with a different type than requested: " + (ad.adType ?? "missing"));
        }
        sdk.lastAdId = ad.id;
        return ad;
      } else if (response.status === 401 || response.status === 403) {
        console.error("AdTogether Error: Invalid App ID. Please check your dashboard.");
        throw new Error(`AdTogether Error: Invalid App ID. Status: ${response.status}`);
      }
      throw new Error(`Failed to fetch ad. Status: ${response.status}`);
    } catch (err) {
      throw err;
    }
  }
  static buildServeUrl(sdk, adUnitId, adType) {
    const fallbackBaseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.ad-together.org";
    const url = new URL(sdk.baseUrl || fallbackBaseUrl, fallbackBaseUrl);
    url.pathname = url.pathname.replace(/\/+$/, "") + "/api/ads/serve";
    url.search = "";
    url.hash = "";
    url.searchParams.set("adUnitId", adUnitId);
    url.searchParams.set("appId", sdk.appId ?? "");
    url.searchParams.set("allowSelfAds", String(sdk.allowSelfAds));
    url.searchParams.set("platform", "web");
    if (adType) {
      url.searchParams.set("adType", adType);
    }
    if (sdk.lastAdId) {
      url.searchParams.set("exclude", sdk.lastAdId);
    }
    if (sdk.bundleId) {
      url.searchParams.set("bundleId", sdk.bundleId);
    }
    if (typeof window !== "undefined") {
      url.searchParams.set("sourceUrl", window.location.href);
    }
    return url.toString();
  }
  static trackImpression(adId, token, viewability) {
    this.trackEvent("/api/ads/impression", adId, token, viewability);
  }
  static trackClick(adId, token) {
    this.trackEvent("/api/ads/click", adId, token);
  }
  static trackEvent(endpoint, adId, token, viewability) {
    if (!_AdTogether.shared.assertInitialized()) return;
    fetch(`${_AdTogether.shared.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adId,
        token,
        appId: _AdTogether.shared.appId,
        ..._AdTogether.shared.bundleId ? { bundleId: _AdTogether.shared.bundleId } : {},
        ...endpoint === "/api/ads/impression" && typeof window !== "undefined" ? { pagePath: window.location.pathname } : {},
        ...endpoint === "/api/ads/impression" && viewability ? viewability : {},
        // Send platform and environment to match Flutter SDK
        platform: "web",
        environment: typeof process !== "undefined" && process.env?.NODE_ENV === "development" ? "development" : "production"
      })
    }).catch(console.error);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdTogether
});
