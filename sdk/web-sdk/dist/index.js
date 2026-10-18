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
  AdTogether: () => AdTogether,
  FrequencyCap: () => FrequencyCap
});
module.exports = __toCommonJS(index_exports);

// src/core/FrequencyCap.ts
var ONE_HOUR_MS = 60 * 60 * 1e3;
var ONE_DAY_MS = 24 * 60 * 60 * 1e3;
var FrequencyCap = class {
  constructor(options = {}) {
    this.inMemoryTimestamps = [];
    this.enabled = options.enabled ?? true;
    this.maxPerHour = options.maxPerHour ?? 3;
    this.maxPerDay = options.maxPerDay ?? 12;
    this.appId = options.appId;
  }
  getStorageKey() {
    const safeAppId = this.appId ? this.appId.replace(/[^a-zA-Z0-9_-]/g, "_") : "default";
    return `adtogether_fc_${safeAppId}`;
  }
  /**
   * Safely read view timestamps from localStorage (with in-memory fallback).
   * Automatically prunes timestamps older than 24 hours.
   */
  getTimestamps(now = Date.now()) {
    let timestamps = [];
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        const raw = window.localStorage.getItem(this.getStorageKey());
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            timestamps = parsed.filter((item) => typeof item === "number" && Number.isFinite(item));
          }
        }
      } catch (e) {
        timestamps = [...this.inMemoryTimestamps];
      }
    } else {
      timestamps = [...this.inMemoryTimestamps];
    }
    const oneDayAgo = now - ONE_DAY_MS;
    const pruned = timestamps.filter((ts) => ts > oneDayAgo && ts <= now + 6e4);
    if (pruned.length !== timestamps.length) {
      this.saveTimestamps(pruned);
    } else {
      this.inMemoryTimestamps = pruned;
    }
    return pruned;
  }
  /**
   * Safely persist view timestamps to localStorage and memory.
   */
  saveTimestamps(timestamps) {
    this.inMemoryTimestamps = timestamps;
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.setItem(this.getStorageKey(), JSON.stringify(timestamps));
      } catch (e) {
      }
    }
  }
  /**
   * Check whether an ad view is permitted under the current hourly and daily limits.
   */
  checkCap(now = Date.now()) {
    if (!this.enabled) {
      return {
        allowed: true,
        hourlyViews: 0,
        dailyViews: 0,
        maxPerHour: this.maxPerHour,
        maxPerDay: this.maxPerDay
      };
    }
    const timestamps = this.getTimestamps(now);
    const oneHourAgo = now - ONE_HOUR_MS;
    const hourlyViews = timestamps.filter((ts) => ts > oneHourAgo).length;
    const dailyViews = timestamps.length;
    if (this.maxPerHour > 0 && Number.isFinite(this.maxPerHour) && hourlyViews >= this.maxPerHour) {
      return {
        allowed: false,
        reason: "hourly_limit_reached",
        hourlyViews,
        dailyViews,
        maxPerHour: this.maxPerHour,
        maxPerDay: this.maxPerDay
      };
    }
    if (this.maxPerDay > 0 && Number.isFinite(this.maxPerDay) && dailyViews >= this.maxPerDay) {
      return {
        allowed: false,
        reason: "daily_limit_reached",
        hourlyViews,
        dailyViews,
        maxPerHour: this.maxPerHour,
        maxPerDay: this.maxPerDay
      };
    }
    return {
      allowed: true,
      hourlyViews,
      dailyViews,
      maxPerHour: this.maxPerHour,
      maxPerDay: this.maxPerDay
    };
  }
  /**
   * Record a viewed ad impression in the frequency tracker.
   */
  recordView(now = Date.now()) {
    if (!this.enabled) return;
    const timestamps = this.getTimestamps(now);
    timestamps.push(now);
    this.saveTimestamps(timestamps);
  }
  /**
   * Get the current status of frequency capping.
   */
  getStatus(now = Date.now()) {
    const check = this.checkCap(now);
    return {
      hourlyViews: check.hourlyViews,
      dailyViews: check.dailyViews,
      maxPerHour: check.maxPerHour,
      maxPerDay: check.maxPerDay,
      isCapped: !check.allowed,
      reason: check.reason
    };
  }
  /**
   * Reset frequency capping storage and in-memory counters.
   */
  reset() {
    this.inMemoryTimestamps = [];
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.removeItem(this.getStorageKey());
      } catch (e) {
      }
    }
  }
};

// src/core/AdTogether.ts
var _AdTogether = class _AdTogether {
  constructor() {
    this.allowSelfAds = true;
    this.baseUrl = "https://www.ad-together.org";
    this.frequencyCap = new FrequencyCap();
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
    const capEnabled = options.enableFrequencyCap !== void 0 ? options.enableFrequencyCap : options.frequencyCap?.enabled !== void 0 ? options.frequencyCap.enabled : true;
    const maxPerHour = options.maxViewsPerHour !== void 0 ? options.maxViewsPerHour : options.frequencyCap?.maxPerHour !== void 0 ? options.frequencyCap.maxPerHour : 3;
    const maxPerDay = options.maxViewsPerDay !== void 0 ? options.maxViewsPerDay : options.frequencyCap?.maxPerDay !== void 0 ? options.frequencyCap.maxPerDay : 12;
    sdk.frequencyCap = new FrequencyCap({
      enabled: capEnabled,
      maxPerHour,
      maxPerDay,
      appId: sdk.appId
    });
    console.log(`AdTogether SDK Initialized with App ID: ${sdk.appId}`);
  }
  assertInitialized() {
    if (!this.appId) {
      console.error("AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.");
      return false;
    }
    return true;
  }
  /**
   * Client-side bot guard: `navigator.webdriver` is exposed as `true` when the
   * page is running inside an automation engine (Selenium, Puppeteer,
   * Playwright, Chrome DevTools Protocol, CI browsers, ...). When detected, the
   * SDK skips ad fetching and impression/click tracking entirely so automated
   * sessions never consume network requests or advertiser credits.
   */
  static isAutomatedBrowser() {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    if (navigator.webdriver === true) return true;
    if ("webdriver" in navigator && navigator.webdriver) return true;
    if (typeof document !== "undefined" && document.documentElement && document.documentElement.getAttribute("webdriver") !== null) {
      return true;
    }
    const win = window;
    if (win._phantom || win.__nightmare || win.callPhantom || win._selenium || win.__webdriver_evaluate || win.__selenium_evaluate || win.__webdriver_script_function || win.__playwright || win.__puppeteer_evaluation_script__ || win.Cypress) {
      return true;
    }
    if (typeof window.outerWidth === "number" && typeof window.outerHeight === "number" && window.outerWidth === 0 && window.outerHeight === 0) {
      return true;
    }
    if (navigator.languages && Array.isArray(navigator.languages) && navigator.languages.length === 0) {
      return true;
    }
    const ua = navigator.userAgent || "";
    if (!ua.trim() || ua.length < 10 || /^(?:empty|null|undefined|none|test|dummy|-+)$/i.test(ua.trim())) return true;
    if (/\+https?:\/\//i.test(ua) || /\bhttps?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(ua) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(ua) || /(?<![a-z0-9]|cu|tal|ro)bots?(?![a-z0-9])/i.test(ua) || /(?<![a-z0-9])(?:spider|crawler|scraper|scanner|probe|archiver|transcoder|fetcher|indexer)(?![a-z0-9])/i.test(ua) || /[a-z0-9_-]+(?:bot|spider|crawler|scraper|scanner)\/[0-9]/i.test(ua) || /[-_]bot\b/i.test(ua) || /\bsearchbot\b/i.test(ua) || /\bheadless\b/i.test(ua) || /(?:iPhone OS|CPU OS)\s*13_2_3\b/i.test(ua) || /\bVersion\/13\.0\.3(?:\.[0-9]+)?\s+Mobile\/[0-9a-z]+\s+Safari\/604\.1\b/i.test(ua) || /\bNexus 5X\b/i.test(ua) || /\bSM-G900P\b/i.test(ua) || /\bMoto G \([0-9]\)/i.test(ua) || /leakix/i.test(ua) || /l9scan/i.test(ua) || /wpscan/i.test(ua) || /\brust[_-]?sniffer\b/i.test(ua) || /googlebot/i.test(ua) || /google-read-aloud/i.test(ua) || /mediapartners-google/i.test(ua) || /meta-webindexer/i.test(ua) || /meta-externalagent/i.test(ua) || /meta-externalfetcher/i.test(ua) || /facebookexternalhit/i.test(ua) || /facebookbot/i.test(ua) || /bingbot/i.test(ua) || /baiduspider/i.test(ua) || /yandex(bot|images|render)?/i.test(ua) || /daumoa/i.test(ua) || /yeti/i.test(ua) || /bytespider/i.test(ua) || /petalbot/i.test(ua) || /applebot/i.test(ua) || /gptbot/i.test(ua) || /chatgpt-user/i.test(ua) || /oai-searchbot/i.test(ua) || /claude-web/i.test(ua) || /claudebot/i.test(ua) || /anthropic-ai/i.test(ua) || /perplexitybot/i.test(ua) || /deepseek/i.test(ua) || /semrush/i.test(ua) || /ahrefs/i.test(ua) || /screaming frog/i.test(ua) || /lighthouse/i.test(ua) || /pagespeed/i.test(ua) || /chrome-lighthouse/i.test(ua) || /Chrome\/99\.0\.4844\.51/i.test(ua)) {
      return true;
    }
    return false;
  }
  static getCacheKey(adUnitId, adType) {
    return `${adType || "banner"}:${adUnitId}`;
  }
  /**
   * Pre-fetch an ad into the memory cache with a 30-second TTL.
   * If an unexpired cached ad already exists, this is a no-op.
   */
  static async prefetchAd(adUnitId = "default", adType = "banner") {
    if (!_AdTogether.shared.assertInitialized()) return;
    if (_AdTogether.isAutomatedBrowser()) return;
    const capCheck = _AdTogether.shared.frequencyCap.checkCap();
    if (!capCheck.allowed) return;
    const cacheKey = _AdTogether.getCacheKey(adUnitId, adType);
    const now = Date.now();
    const existing = _AdTogether.adCache.get(cacheKey);
    if (existing && existing.expiresAt > now) {
      return;
    }
    try {
      const ad = await _AdTogether.fetchAd(adUnitId, adType);
      _AdTogether.adCache.set(cacheKey, {
        ad,
        expiresAt: Date.now() + _AdTogether.AD_CACHE_TTL_MS
      });
    } catch {
    }
  }
  /**
   * Clears any cached pre-fetched ads from memory.
   */
  static clearAdCache() {
    _AdTogether.adCache.clear();
  }
  static async fetchAd(adUnitId = "default", adType) {
    if (!_AdTogether.shared.assertInitialized()) {
      throw new Error("AdTogether not initialized");
    }
    if (_AdTogether.isAutomatedBrowser()) {
      throw new Error("AdTogether: automated browser detected (navigator.webdriver); ad fetch skipped.");
    }
    const capCheck = _AdTogether.shared.frequencyCap.checkCap();
    if (!capCheck.allowed) {
      throw new Error(`AdTogether: Frequency cap exceeded (${capCheck.reason}). Ad fetch skipped.`);
    }
    const cacheKey = _AdTogether.getCacheKey(adUnitId, adType);
    const now = Date.now();
    const cached = _AdTogether.adCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      _AdTogether.shared.lastAdId = cached.ad.id;
      return cached.ad;
    }
    _AdTogether.adCache.delete(cacheKey);
    const inflight = _AdTogether.inflightRequests.get(cacheKey);
    if (inflight) {
      return inflight;
    }
    const fetchPromise = (async () => {
      try {
        const sdk = _AdTogether.shared;
        const url = _AdTogether.buildServeUrl(sdk, adUnitId, adType);
        const response = await fetch(url);
        if (response.status === 204) {
          throw new Error("AdTogether: No ad available.");
        }
        if (response.ok) {
          const ad = await response.json();
          if (adType && ad.adType !== adType) {
            throw new Error("Received an ad with a different type than requested: " + (ad.adType ?? "missing"));
          }
          _AdTogether.adCache.set(cacheKey, {
            ad,
            expiresAt: Date.now() + _AdTogether.AD_CACHE_TTL_MS
          });
          sdk.lastAdId = ad.id;
          return ad;
        } else if (response.status === 401 || response.status === 403) {
          console.error("AdTogether Error: Invalid App ID. Please check your dashboard.");
          throw new Error(`AdTogether Error: Invalid App ID. Status: ${response.status}`);
        }
        throw new Error(`Failed to fetch ad. Status: ${response.status}`);
      } finally {
        _AdTogether.inflightRequests.delete(cacheKey);
      }
    })();
    _AdTogether.inflightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
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
    const sdk = _AdTogether.shared;
    if (!sdk.assertInitialized()) return;
    if (_AdTogether.isAutomatedBrowser()) return;
    const capCheck = sdk.frequencyCap.checkCap();
    if (!capCheck.allowed) {
      console.warn(`AdTogether: Impression skipped - frequency cap exceeded (${capCheck.reason}).`);
      return;
    }
    sdk.frequencyCap.recordView();
    this.trackEvent("/api/ads/impression", adId, token, viewability);
  }
  static trackClick(adId, token) {
    if (token) {
      if (this.clickedTokens.has(token)) return;
      this.clickedTokens.add(token);
      if (this.clickedTokens.size > 200) {
        const oldest = this.clickedTokens.values().next().value;
        if (oldest) this.clickedTokens.delete(oldest);
      }
    }
    this.trackEvent("/api/ads/click", adId, token);
  }
  /**
   * Get the current client-side frequency capping status (hourly and daily view counts).
   */
  static getFrequencyCapStatus() {
    return _AdTogether.shared.frequencyCap.getStatus();
  }
  /**
   * Reset client-side frequency capping counters.
   */
  static resetFrequencyCap() {
    _AdTogether.shared.frequencyCap.reset();
  }
  static trackEvent(endpoint, adId, token, viewability) {
    if (!_AdTogether.shared.assertInitialized()) return;
    if (_AdTogether.isAutomatedBrowser()) return;
    fetch(`${_AdTogether.shared.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      keepalive: true,
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
_AdTogether.adCache = /* @__PURE__ */ new Map();
_AdTogether.inflightRequests = /* @__PURE__ */ new Map();
_AdTogether.AD_CACHE_TTL_MS = 30 * 1e3;
// 30 seconds
_AdTogether.clickedTokens = /* @__PURE__ */ new Set();
var AdTogether = _AdTogether;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdTogether,
  FrequencyCap
});
