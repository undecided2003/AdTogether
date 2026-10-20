type AdType = 'banner' | 'interstitial';
interface ViewabilityMetrics {
    visiblePercent: number;
    visibleDurationMs: number;
    containerWidth?: number;
    containerHeight?: number;
}
interface AdModel {
    id: string;
    title: string;
    description: string;
    clickUrl?: string;
    imageUrl?: string;
    token?: string;
    adType?: AdType;
}
interface FrequencyCapOptions {
    /**
     * Maximum number of ad views allowed per rolling hour.
     * Defaults to 3. Set to 0 or Infinity to disable hourly capping.
     */
    maxPerHour?: number;
    /**
     * Maximum number of ad views allowed per rolling 24-hour day.
     * Defaults to 12. Set to 0 or Infinity to disable daily capping.
     */
    maxPerDay?: number;
    /**
     * Whether client-side frequency capping is enabled. Defaults to true.
     */
    enabled?: boolean;
}
interface FrequencyCapStatus {
    hourlyViews: number;
    dailyViews: number;
    maxPerHour: number;
    maxPerDay: number;
    isCapped: boolean;
    reason?: 'hourly_limit_reached' | 'daily_limit_reached';
}
interface AdTogetherOptions {
    /** The unique identifier for your application. */
    appId?: string;
    /** @deprecated Use appId instead */
    apiKey?: string;
    baseUrl?: string;
    bundleId?: string;
    /** Whether to show your own ads as fallback if no external ads are available. Defaults to true. */
    allowSelfAds?: boolean;
    /**
     * Frequency capping configuration to limit impressions per user across rolling hour and day windows.
     */
    frequencyCap?: FrequencyCapOptions;
    /** Shorthand: Maximum number of ad views allowed per rolling hour. Defaults to 3. */
    maxViewsPerHour?: number;
    /** Shorthand: Maximum number of ad views allowed per rolling 24-hour day. Defaults to 12. */
    maxViewsPerDay?: number;
    /** Shorthand: Whether frequency capping is enabled. Defaults to true. */
    enableFrequencyCap?: boolean;
}

declare class FrequencyCap {
    enabled: boolean;
    maxPerHour: number;
    maxPerDay: number;
    private appId?;
    private inMemoryTimestamps;
    constructor(options?: {
        enabled?: boolean;
        maxPerHour?: number;
        maxPerDay?: number;
        appId?: string;
    });
    private getStorageKey;
    /**
     * Safely read view timestamps from localStorage (with in-memory fallback).
     * Automatically prunes timestamps older than 24 hours.
     */
    private getTimestamps;
    /**
     * Safely persist view timestamps to localStorage and memory.
     */
    private saveTimestamps;
    /**
     * Check whether an ad view is permitted under the current hourly and daily limits.
     */
    checkCap(now?: number): {
        allowed: boolean;
        reason?: 'hourly_limit_reached' | 'daily_limit_reached';
        hourlyViews: number;
        dailyViews: number;
        maxPerHour: number;
        maxPerDay: number;
    };
    /**
     * Record a viewed ad impression in the frequency tracker.
     */
    recordView(now?: number): void;
    /**
     * Get the current status of frequency capping.
     */
    getStatus(now?: number): FrequencyCapStatus;
    /**
     * Reset frequency capping storage and in-memory counters.
     */
    reset(): void;
}

declare class AdTogether {
    private static instance;
    private appId?;
    private bundleId?;
    private allowSelfAds;
    baseUrl: string;
    frequencyCap: FrequencyCap;
    private constructor();
    static get shared(): AdTogether;
    static initialize(options: AdTogetherOptions): void;
    assertInitialized(): boolean;
    /**
     * Client-side bot guard: `navigator.webdriver` is exposed as `true` when the
     * page is running inside an automation engine (Selenium, Puppeteer,
     * Playwright, Chrome DevTools Protocol, CI browsers, ...). When detected, the
     * SDK skips ad fetching and impression/click tracking entirely so automated
     * sessions never consume network requests or advertiser credits.
     */
    private static isAutomatedBrowser;
    private lastAdId?;
    private static adCache;
    private static inflightRequests;
    private static readonly AD_CACHE_TTL_MS;
    private static clickedTokens;
    private static rateLimitedUntilMs;
    private static readonly RATE_LIMIT_STORAGE_KEY;
    private static readonly DEFAULT_RATE_LIMIT_BACKOFF_MS;
    private static getCacheKey;
    /**
     * Pre-fetch an ad into the memory cache with a 60-second TTL.
     * If an unexpired cached ad already exists, this is a no-op.
     */
    static prefetchAd(adUnitId?: string, adType?: AdType): Promise<void>;
    /**
     * Clears any cached pre-fetched ads from memory.
     */
    static clearAdCache(): void;
    static fetchAd(adUnitId?: string, adType?: AdType): Promise<AdModel>;
    /**
     * Whether a server-issued rate-limit backoff window is currently active.
     * The window is rehydrated from sessionStorage so a page reload or a new
     * tab never resets an in-progress backoff.
     */
    private static isServerRateLimited;
    /**
     * Record a server rate-limit backoff window from a 429 response.
     * Honors the `Retry-After` header (delta-seconds or HTTP date) and clamps
     * the window to [1s, 24h], defaulting to 60s when the header is missing.
     */
    private static noteServerRateLimit;
    private static buildServeUrl;
    static trackImpression(adId: string, token?: string, viewability?: ViewabilityMetrics): void;
    static trackClick(adId: string, token?: string): void;
    /**
     * Get the current client-side frequency capping status (hourly and daily view counts).
     */
    static getFrequencyCapStatus(): FrequencyCapStatus;
    /**
     * Reset client-side frequency capping counters.
     */
    static resetFrequencyCap(): void;
    private static trackEvent;
}

export { type AdModel, AdTogether, type AdTogetherOptions, type AdType, FrequencyCap, type FrequencyCapOptions, type FrequencyCapStatus, type ViewabilityMetrics };
