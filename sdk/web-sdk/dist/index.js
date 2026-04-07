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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdTogether
});
