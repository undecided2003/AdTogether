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

// src/react/index.ts
var react_exports = {};
__export(react_exports, {
  AdTogetherBanner: () => AdTogetherBanner,
  AdTogetherInterstitial: () => AdTogetherInterstitial
});
module.exports = __toCommonJS(react_exports);

// src/react/AdTogetherBanner.tsx
var import_react = require("react");

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
   * Pre-fetch an ad into the memory cache with a 60-second TTL.
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
    if (_AdTogether.isServerRateLimited()) {
      throw new Error("AdTogether: server rate limit active; ad fetch skipped until the backoff window resets.");
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
        } else if (response.status === 429) {
          _AdTogether.noteServerRateLimit(response);
          console.warn("AdTogether: server rate limit reached (429). Backing off.");
          throw new Error("AdTogether: Server rate limit reached (429). Backing off until the limit window resets.");
        }
        throw new Error(`Failed to fetch ad. Status: ${response.status}`);
      } finally {
        _AdTogether.inflightRequests.delete(cacheKey);
      }
    })();
    _AdTogether.inflightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }
  /**
   * Whether a server-issued rate-limit backoff window is currently active.
   * The window is rehydrated from sessionStorage so a page reload or a new
   * tab never resets an in-progress backoff.
   */
  static isServerRateLimited() {
    if (_AdTogether.rateLimitedUntilMs > Date.now()) return true;
    let persisted = 0;
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage?.getItem(_AdTogether.RATE_LIMIT_STORAGE_KEY);
        const parsed = raw ? Number.parseInt(raw, 10) : 0;
        persisted = Number.isFinite(parsed) && parsed > Date.now() ? parsed : 0;
      } catch {
        persisted = 0;
      }
    }
    _AdTogether.rateLimitedUntilMs = persisted;
    return persisted > 0;
  }
  /**
   * Record a server rate-limit backoff window from a 429 response.
   * Honors the `Retry-After` header (delta-seconds or HTTP date) and clamps
   * the window to [1s, 24h], defaulting to 60s when the header is missing.
   */
  static noteServerRateLimit(response) {
    let backoffSeconds = _AdTogether.DEFAULT_RATE_LIMIT_BACKOFF_MS / 1e3;
    const header = response?.headers?.get("retry-after");
    if (header) {
      const asSeconds = Number.parseInt(header, 10);
      if (Number.isFinite(asSeconds) && asSeconds > 0) {
        backoffSeconds = asSeconds;
      } else {
        const asDate = Date.parse(header);
        if (!Number.isNaN(asDate)) {
          backoffSeconds = Math.max(1, Math.ceil((asDate - Date.now()) / 1e3));
        }
      }
    }
    const until = Date.now() + Math.min(backoffSeconds, 86400) * 1e3;
    _AdTogether.rateLimitedUntilMs = until;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage?.setItem(_AdTogether.RATE_LIMIT_STORAGE_KEY, String(until));
      } catch {
      }
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
_AdTogether.AD_CACHE_TTL_MS = 60 * 1e3;
// 60 seconds
_AdTogether.clickedTokens = /* @__PURE__ */ new Set();
// Server-enforced rate-limit backoff (HTTP 429 from /api/ads/serve). While
// the backoff window is active, the SDK answers from cache only and never
// hits the network, so frequency-capped or throttled clients stop issuing
// guaranteed-429 requests that waste server invocations.
_AdTogether.rateLimitedUntilMs = 0;
_AdTogether.RATE_LIMIT_STORAGE_KEY = "adtogether_rl_until";
_AdTogether.DEFAULT_RATE_LIMIT_BACKOFF_MS = 60 * 1e3;
var AdTogether = _AdTogether;

// src/react/AdTogetherBanner.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var AdTogetherBanner = ({
  adUnitId = "default",
  className = "",
  style = {},
  onAdLoaded,
  onAdFailedToLoad,
  showCloseButton = false,
  onAdClosed,
  width = "100%",
  height = "auto",
  theme = "auto"
}) => {
  const [adData, setAdData] = (0, import_react.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [hasError, setHasError] = (0, import_react.useState)(false);
  const [isVisible, setIsVisible] = (0, import_react.useState)(true);
  const [isDarkMode, setIsDarkMode] = (0, import_react.useState)(theme === "dark");
  const containerRef = (0, import_react.useRef)(null);
  const impressionTrackedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(mediaQuery.matches);
      const handler = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setIsDarkMode(theme === "dark");
    }
  }, [theme]);
  (0, import_react.useEffect)(() => {
    let isMounted = true;
    AdTogether.fetchAd(adUnitId, "banner").then((ad) => {
      if (isMounted) {
        setAdData(ad);
        setIsLoading(false);
        onAdLoaded?.();
      }
    }).catch((err) => {
      if (isMounted) {
        if (err?.message?.includes("Frequency cap exceeded")) {
          console.info("AdTogether:", err.message);
        } else {
          console.error("AdTogether Failed to load ad:", err);
        }
        setHasError(true);
        setIsLoading(false);
        onAdFailedToLoad?.(err);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [adUnitId, onAdLoaded, onAdFailedToLoad]);
  (0, import_react.useEffect)(() => {
    if (!adData || isLoading || hasError || !isVisible || !containerRef.current) return;
    let visibleTimer = null;
    let visibleSince = null;
    let latestVisibleRatio = 0;
    const isElementTrulyVisible = (el) => {
      if (!el || !el.isConnected) return false;
      if (document.visibilityState !== "visible") return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 20) return false;
      const winWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const winHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      if (winWidth <= 0 || winHeight <= 0) return false;
      if (rect.bottom <= 0 || rect.top >= winHeight || rect.right <= 0 || rect.left >= winWidth) {
        return false;
      }
      try {
        const style2 = window.getComputedStyle(el);
        if (style2.display === "none" || style2.visibility === "hidden") return false;
        const opacity = parseFloat(style2.opacity);
        if (!isNaN(opacity) && opacity < 0.1) return false;
      } catch (_) {
      }
      return true;
    };
    const clearVisibleTimer = () => {
      if (visibleTimer) clearTimeout(visibleTimer);
      visibleTimer = null;
      visibleSince = null;
    };
    const startVisibleTimer = () => {
      if (visibleTimer || impressionTrackedRef.current || document.visibilityState !== "visible" || !isElementTrulyVisible(container)) return;
      visibleSince = Date.now();
      visibleTimer = setTimeout(() => {
        const visibleDurationMs = visibleSince === null ? 0 : Date.now() - visibleSince;
        const visiblePercent = Math.round(latestVisibleRatio * 100);
        visibleTimer = null;
        visibleSince = null;
        if (impressionTrackedRef.current || !isVisible || !container.isConnected || document.visibilityState !== "visible" || visiblePercent < 50 || visibleDurationMs < 1e3 || !isElementTrulyVisible(container)) return;
        const rect = container.getBoundingClientRect();
        impressionTrackedRef.current = true;
        AdTogether.trackImpression(adData.id, adData.token, {
          visiblePercent,
          visibleDurationMs,
          containerWidth: Math.round(rect.width),
          containerHeight: Math.round(rect.height)
        });
        observer.disconnect();
      }, 1e3);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        latestVisibleRatio = entry.intersectionRatio;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === "visible" && isElementTrulyVisible(container)) {
          startVisibleTimer();
        } else {
          clearVisibleTimer();
        }
      },
      { threshold: [0, 0.5] }
    );
    const container = containerRef.current;
    const handleVisibilityChange = () => {
      clearVisibleTimer();
      if (document.visibilityState === "visible") {
        latestVisibleRatio = 0;
        observer.unobserve(container);
        observer.observe(container);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    observer.observe(container);
    return () => {
      clearVisibleTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, [adData, isLoading, hasError, isVisible]);
  const handleContainerClick = () => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      window.open(adData.clickUrl, "_blank", "noopener,noreferrer");
    }
  };
  const handleClose = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    onAdClosed?.();
  };
  if (!isVisible) {
    return null;
  }
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        style: { width, height, ...style },
        className
      }
    );
  }
  if (hasError || !adData) {
    return null;
  }
  const bgColor = isDarkMode ? "#1F2937" : "#ffffff";
  const borderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const textColor = isDarkMode ? "#F9FAFB" : "#111827";
  const descColor = isDarkMode ? "#9CA3AF" : "#6B7280";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      ref: containerRef,
      className: `adtogether-banner ${className}`,
      onClick: handleContainerClick,
      style: {
        display: "flex",
        flexDirection: "row",
        width,
        height,
        backgroundColor: bgColor,
        borderRadius: "12px",
        border: `1px solid ${borderColor}`,
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        cursor: "pointer",
        boxSizing: "border-box",
        position: "relative",
        ...style
      },
      onMouseOver: (e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.transition = "transform 0.2s";
      },
      onMouseOut: (e) => {
        e.currentTarget.style.transform = "scale(1)";
      },
      children: [
        adData.imageUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flexShrink: 0, width: "120px", height: "100%", minHeight: "80px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "img",
          {
            src: adData.imageUrl,
            alt: adData.title,
            style: { width: "100%", height: "100%", objectFit: "cover" }
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: "bold", fontSize: "14px", color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: adData.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
              backgroundColor: "#FBBF24",
              color: "#000",
              fontSize: "9px",
              fontWeight: "bold",
              padding: "2px 4px",
              borderRadius: "4px",
              marginLeft: "8px"
            }, children: "AD" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "12px", color: descColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: adData.description })
        ] }),
        showCloseButton && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: handleClose,
            "aria-label": "Close ad",
            style: {
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              border: "none",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              lineHeight: 1,
              zIndex: 1
            },
            children: "\xD7"
          }
        )
      ]
    }
  );
};

// src/react/AdTogetherInterstitial.tsx
var import_react2 = require("react");
var import_react_dom = require("react-dom");
var import_jsx_runtime2 = require("react/jsx-runtime");
var AdTogetherInterstitial = ({
  adUnitId = "default",
  isOpen,
  onClose,
  onAdLoaded,
  onAdFailedToLoad,
  theme = "auto",
  closeDelay = 3
}) => {
  const [adData, setAdData] = (0, import_react2.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react2.useState)(false);
  const [hasError, setHasError] = (0, import_react2.useState)(false);
  const [isDarkMode, setIsDarkMode] = (0, import_react2.useState)(theme === "dark");
  const [canClose, setCanClose] = (0, import_react2.useState)(false);
  const [countdown, setCountdown] = (0, import_react2.useState)(closeDelay);
  const impressionTrackedRef = (0, import_react2.useRef)(false);
  const closeTimerRef = (0, import_react2.useRef)(null);
  const countdownRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(mediaQuery.matches);
      const handler = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setIsDarkMode(theme === "dark");
    }
  }, [theme]);
  (0, import_react2.useEffect)(() => {
    if (!isOpen) {
      setAdData(null);
      setIsLoading(false);
      setHasError(false);
      setCanClose(false);
      setCountdown(closeDelay);
      impressionTrackedRef.current = false;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    AdTogether.fetchAd(adUnitId, "interstitial").then((ad) => {
      if (isMounted) {
        setAdData(ad);
        setIsLoading(false);
        onAdLoaded?.();
      }
    }).catch((err) => {
      if (isMounted) {
        if (err?.message?.includes("Frequency cap exceeded")) {
          console.info("AdTogether:", err.message);
        } else {
          console.error("AdTogether Failed to load interstitial:", err);
        }
        setHasError(true);
        setIsLoading(false);
        onAdFailedToLoad?.(err);
        onClose();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, adUnitId]);
  (0, import_react2.useEffect)(() => {
    if (!isOpen || !adData) return;
    setCountdown(closeDelay);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1e3);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOpen, adData, closeDelay]);
  (0, import_react2.useEffect)(() => {
    if (!adData || !isOpen || impressionTrackedRef.current) return;
    let visibleTimer = null;
    let visibleSince = null;
    const clearVisibleTimer = () => {
      if (visibleTimer) clearTimeout(visibleTimer);
      visibleTimer = null;
      visibleSince = null;
    };
    const startVisibleTimer = () => {
      if (visibleTimer || impressionTrackedRef.current || document.visibilityState !== "visible") return;
      visibleSince = Date.now();
      visibleTimer = setTimeout(() => {
        const visibleDurationMs = visibleSince === null ? 0 : Date.now() - visibleSince;
        visibleTimer = null;
        visibleSince = null;
        if (impressionTrackedRef.current || document.visibilityState !== "visible" || visibleDurationMs < 1e3) return;
        impressionTrackedRef.current = true;
        AdTogether.trackImpression(adData.id, adData.token, {
          visiblePercent: 100,
          visibleDurationMs
        });
      }, 1e3);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") startVisibleTimer();
      else clearVisibleTimer();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    startVisibleTimer();
    return () => {
      clearVisibleTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [adData, isOpen]);
  const handleAdClick = (0, import_react2.useCallback)(() => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      window.open(adData.clickUrl, "_blank", "noopener,noreferrer");
    }
  }, [adData]);
  const handleClose = (0, import_react2.useCallback)(() => {
    if (canClose) {
      onClose();
    }
  }, [canClose, onClose]);
  (0, import_react2.useEffect)(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  if (!isOpen) return null;
  const bgOverlay = "rgba(0, 0, 0, 0.7)";
  const cardBg = isDarkMode ? "#1F2937" : "#ffffff";
  const borderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const textColor = isDarkMode ? "#F9FAFB" : "#111827";
  const descColor = isDarkMode ? "#9CA3AF" : "#6B7280";
  const content = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className: "adtogether-interstitial-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: bgOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1e5,
        backdropFilter: "blur(8px)",
        animation: "adtogether-fade-in 0.3s ease-out"
      },
      onClick: (e) => {
        if (e.target === e.currentTarget && canClose) handleClose();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: `
        @keyframes adtogether-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes adtogether-scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .adtogether-interstitial-card {
          display: flex;
          flex-direction: column;
        }
        .adtogether-interstitial-img-wrapper {
          width: 100%;
        }
        
        @media (orientation: landscape) and (max-height: 600px) {
          .adtogether-interstitial-card {
            flex-direction: row;
            max-height: 90vh;
          }
          .adtogether-interstitial-img-wrapper {
            width: 50%;
            flex-shrink: 0;
            display: flex;
          }
          .adtogether-interstitial-img-wrapper img {
            height: 100% !important;
            aspect-ratio: auto !important;
          }
          .adtogether-interstitial-content {
            width: 50%;
            overflow-y: auto;
          }
        }
      ` }),
        isLoading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { color: "#fff", fontSize: "18px" }, children: "Loading Ad..." }) : adData ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            className: "adtogether-interstitial-card",
            style: {
              position: "relative",
              maxWidth: "800px",
              width: "95%",
              backgroundColor: cardBg,
              borderRadius: "24px",
              border: `1px solid ${borderColor}`,
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
              animation: "adtogether-scale-in 0.3s ease-out"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", top: "12px", right: "12px", zIndex: 10 }, children: canClose ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  onClick: handleClose,
                  style: {
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    border: "none",
                    color: "#fff",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)"
                  },
                  "aria-label": "Close ad",
                  children: "\u2715"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "div",
                {
                  style: {
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)"
                  },
                  children: countdown
                }
              ) }),
              adData.imageUrl && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "div",
                {
                  className: "adtogether-interstitial-img-wrapper",
                  style: { cursor: "pointer", position: "relative", backgroundColor: isDarkMode ? "#111827" : "#F3F4F6" },
                  onClick: handleAdClick,
                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "img",
                    {
                      src: adData.imageUrl,
                      alt: adData.title,
                      style: {
                        width: "100%",
                        maxHeight: "350px",
                        objectFit: "contain",
                        display: "block"
                      }
                    }
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "div",
                {
                  className: "adtogether-interstitial-content",
                  style: { padding: "20px", cursor: "pointer" },
                  onClick: handleAdClick,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontWeight: "bold", fontSize: "18px", color: textColor }, children: adData.title }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "span",
                        {
                          style: {
                            backgroundColor: "#FBBF24",
                            color: "#000",
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "3px 6px",
                            borderRadius: "4px",
                            marginLeft: "8px",
                            flexShrink: 0
                          },
                          children: "AD"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { fontSize: "14px", color: descColor, margin: 0, lineHeight: 1.5 }, children: adData.description }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "button",
                      {
                        style: {
                          marginTop: "16px",
                          width: "100%",
                          padding: "12px",
                          backgroundColor: "#F59E0B",
                          color: "#000",
                          fontWeight: "bold",
                          fontSize: "14px",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer"
                        },
                        onClick: (e) => {
                          e.stopPropagation();
                          handleAdClick();
                        },
                        children: "Learn More \u2192"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "p",
                      {
                        style: {
                          marginTop: "12px",
                          marginBottom: 0,
                          fontSize: "10px",
                          color: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                          textAlign: "center",
                          letterSpacing: "0.3px"
                        },
                        children: "Powered by AdTogether"
                      }
                    )
                  ]
                }
              )
            ]
          }
        ) : null
      ]
    }
  );
  return (0, import_react_dom.createPortal)(content, document.body);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdTogetherBanner,
  AdTogetherInterstitial
});
