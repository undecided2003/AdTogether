import { AdModel, AdType, AdTogetherOptions, FrequencyCapStatus, ViewabilityMetrics } from './types';
import { FrequencyCap } from './FrequencyCap';

export class AdTogether {
  private static instance: AdTogether;
  private appId?: string;
  private bundleId?: string;
  private allowSelfAds: boolean = true;
  public baseUrl: string = 'https://www.ad-together.org';
  public frequencyCap: FrequencyCap = new FrequencyCap();

  private constructor() {}

  static get shared(): AdTogether {
    if (!AdTogether.instance) {
      AdTogether.instance = new AdTogether();
    }
    return AdTogether.instance;
  }

  static initialize(options: AdTogetherOptions) {
    const sdk = AdTogether.shared;
    
    if (options.apiKey && !options.appId) {
      console.warn('AdTogether: "apiKey" is deprecated. Please use "appId" instead.');
      sdk.appId = options.apiKey;
    } else {
      sdk.appId = options.appId;
    }
    
    if (options.bundleId) {
      sdk.bundleId = options.bundleId;
    } else if (typeof window !== 'undefined') {
      sdk.bundleId = window.location.hostname;
    }

    if (options.allowSelfAds !== undefined) {
      sdk.allowSelfAds = options.allowSelfAds;
    }
    
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    } else if (typeof window !== 'undefined') {
      // In browser, default to relative paths if no base URL provided
      sdk.baseUrl = '';
    }

    const capEnabled = options.enableFrequencyCap !== undefined
      ? options.enableFrequencyCap
      : (options.frequencyCap?.enabled !== undefined ? options.frequencyCap.enabled : true);

    const maxPerHour = options.maxViewsPerHour !== undefined
      ? options.maxViewsPerHour
      : (options.frequencyCap?.maxPerHour !== undefined ? options.frequencyCap.maxPerHour : 3);

    const maxPerDay = options.maxViewsPerDay !== undefined
      ? options.maxViewsPerDay
      : (options.frequencyCap?.maxPerDay !== undefined ? options.frequencyCap.maxPerDay : 12);

    sdk.frequencyCap = new FrequencyCap({
      enabled: capEnabled,
      maxPerHour,
      maxPerDay,
      appId: sdk.appId,
    });
    
    console.log(`AdTogether SDK Initialized with App ID: ${sdk.appId}`);
  }

  assertInitialized() {
    if (!this.appId) {
      console.error('AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.');
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
  private static isAutomatedBrowser(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    // 1. Standard automation flags
    if (navigator.webdriver === true) return true;
    if ('webdriver' in navigator && (navigator as any).webdriver) return true;
    if (typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute('webdriver') !== null) {
      return true;
    }

    // 2. Headless browser automation attributes & framework globals
    const win = window as any;
    if (
      win._phantom ||
      win.__nightmare ||
      win.callPhantom ||
      win._selenium ||
      win.__webdriver_evaluate ||
      win.__selenium_evaluate ||
      win.__webdriver_script_function ||
      win.__playwright ||
      win.__puppeteer_evaluation_script__ ||
      win.Cypress
    ) {
      return true;
    }

    // 3. Headless environment window dimension anomalies:
    // Real browsers on desktop and mobile have positive outer dimensions.
    // Headless Chromium / Puppeteer frequently defaults outer dimensions to 0x0.
    if (
      typeof window.outerWidth === 'number' &&
      typeof window.outerHeight === 'number' &&
      window.outerWidth === 0 &&
      window.outerHeight === 0
    ) {
      return true;
    }

    // 4. Missing languages:
    // Real users on mobile or desktop always have at least one language configured in their OS/browser.
    // Raw headless Chromium instances running without locale args frequently expose an empty languages array.
    if (navigator.languages && Array.isArray(navigator.languages) && navigator.languages.length === 0) {
      return true;
    }

    // 5. Crawler & automated scraper user agent tokens
    const ua = navigator.userAgent || '';
    if (!ua.trim() || ua.length < 10 || /^(?:empty|null|undefined|none|test|dummy|-+)$/i.test(ua.trim())) return true;

    if (
      /\+https?:\/\//i.test(ua) ||
      /\bhttps?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(ua) ||
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(ua) ||
      /(?<![a-z0-9]|cu|tal|ro)bots?(?![a-z0-9])/i.test(ua) ||
      /(?<![a-z0-9])(?:spider|crawler|scraper|scanner|probe|archiver|transcoder|fetcher|indexer)(?![a-z0-9])/i.test(ua) ||
      /[a-z0-9_-]+(?:bot|spider|crawler|scraper|scanner)\/[0-9]/i.test(ua) ||
      /[-_]bot\b/i.test(ua) ||
      /\bsearchbot\b/i.test(ua) ||
      /\bheadless\b/i.test(ua) ||
      /(?:iPhone OS|CPU OS)\s*13_2_3\b/i.test(ua) ||
      /\bVersion\/13\.0\.3(?:\.[0-9]+)?\s+Mobile\/[0-9a-z]+\s+Safari\/604\.1\b/i.test(ua) ||
      /\bNexus 5X\b/i.test(ua) ||
      /\bSM-G900P\b/i.test(ua) ||
      /\bMoto G \([0-9]\)/i.test(ua) ||
      /leakix/i.test(ua) ||
      /l9scan/i.test(ua) ||
      /wpscan/i.test(ua) ||
      /\brust[_-]?sniffer\b/i.test(ua) ||
      /googlebot/i.test(ua) ||
      /google-read-aloud/i.test(ua) ||
      /mediapartners-google/i.test(ua) ||
      /meta-webindexer/i.test(ua) ||
      /meta-externalagent/i.test(ua) ||
      /meta-externalfetcher/i.test(ua) ||
      /facebookexternalhit/i.test(ua) ||
      /facebookbot/i.test(ua) ||
      /bingbot/i.test(ua) ||
      /baiduspider/i.test(ua) ||
      /yandex(bot|images|render)?/i.test(ua) ||
      /daumoa/i.test(ua) ||
      /yeti/i.test(ua) ||
      /bytespider/i.test(ua) ||
      /petalbot/i.test(ua) ||
      /applebot/i.test(ua) ||
      /gptbot/i.test(ua) ||
      /chatgpt-user/i.test(ua) ||
      /oai-searchbot/i.test(ua) ||
      /claude-web/i.test(ua) ||
      /claudebot/i.test(ua) ||
      /anthropic-ai/i.test(ua) ||
      /perplexitybot/i.test(ua) ||
      /deepseek/i.test(ua) ||
      /semrush/i.test(ua) ||
      /ahrefs/i.test(ua) ||
      /screaming frog/i.test(ua) ||
      /lighthouse/i.test(ua) ||
      /pagespeed/i.test(ua) ||
      /chrome-lighthouse/i.test(ua) ||
      /Chrome\/99\.0\.4844\.51/i.test(ua)
    ) {
      return true;
    }

    return false;
  }

  private lastAdId?: string;
  private static adCache: Map<string, { ad: AdModel; expiresAt: number }> = new Map();
  private static inflightRequests: Map<string, Promise<AdModel>> = new Map();
  private static readonly AD_CACHE_TTL_MS = 60 * 1000; // 60 seconds
  private static clickedTokens: Set<string> = new Set();

  // Server-enforced rate-limit backoff (HTTP 429 from /api/ads/serve). While
  // the backoff window is active, the SDK answers from cache only and never
  // hits the network, so frequency-capped or throttled clients stop issuing
  // guaranteed-429 requests that waste server invocations.
  private static rateLimitedUntilMs: number = 0;
  private static readonly RATE_LIMIT_STORAGE_KEY = 'adtogether_rl_until';
  private static readonly DEFAULT_RATE_LIMIT_BACKOFF_MS = 60 * 1000;

  private static getCacheKey(adUnitId: string, adType?: AdType): string {
    return `${adType || 'banner'}:${adUnitId}`;
  }

  /**
   * Pre-fetch an ad into the memory cache with a 60-second TTL.
   * If an unexpired cached ad already exists, this is a no-op.
   */
  static async prefetchAd(adUnitId: string = 'default', adType: AdType = 'banner'): Promise<void> {
    if (!AdTogether.shared.assertInitialized()) return;
    if (AdTogether.isAutomatedBrowser()) return;

    const capCheck = AdTogether.shared.frequencyCap.checkCap();
    if (!capCheck.allowed) return;

    const cacheKey = AdTogether.getCacheKey(adUnitId, adType);
    const now = Date.now();
    const existing = AdTogether.adCache.get(cacheKey);
    if (existing && existing.expiresAt > now) {
      return;
    }

    try {
      const ad = await AdTogether.fetchAd(adUnitId, adType);
      AdTogether.adCache.set(cacheKey, {
        ad,
        expiresAt: Date.now() + AdTogether.AD_CACHE_TTL_MS,
      });
    } catch {
      // Ignore background prefetch errors
    }
  }

  /**
   * Clears any cached pre-fetched ads from memory.
   */
  static clearAdCache(): void {
    AdTogether.adCache.clear();
  }

  static async fetchAd(adUnitId: string = 'default', adType?: AdType): Promise<AdModel> {
    if (!AdTogether.shared.assertInitialized()) {
      throw new Error('AdTogether not initialized');
    }

    // Bot guard: never request an ad from an automated browser.
    if (AdTogether.isAutomatedBrowser()) {
      throw new Error('AdTogether: automated browser detected (navigator.webdriver); ad fetch skipped.');
    }

    // Client-side frequency cap: never fetch if hourly or daily view limits have been reached.
    const capCheck = AdTogether.shared.frequencyCap.checkCap();
    if (!capCheck.allowed) {
      throw new Error(`AdTogether: Frequency cap exceeded (${capCheck.reason}). Ad fetch skipped.`);
    }

    const cacheKey = AdTogether.getCacheKey(adUnitId, adType);
    const now = Date.now();
    const cached = AdTogether.adCache.get(cacheKey);

    // Return cached ad if fresh
    if (cached && cached.expiresAt > now) {
      AdTogether.shared.lastAdId = cached.ad.id;
      return cached.ad;
    }
    AdTogether.adCache.delete(cacheKey);

    // Coalesce concurrent requests for the same ad unit & type (thundering herd guard)
    const inflight = AdTogether.inflightRequests.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    // Honor an active server rate-limit backoff: never re-hit the network
    // while the server has told us to wait. Fresh cached ads were already
    // returned above, so real users keep seeing their last creative for free.
    if (AdTogether.isServerRateLimited()) {
      throw new Error('AdTogether: server rate limit active; ad fetch skipped until the backoff window resets.');
    }

    const fetchPromise = (async () => {
      try {
        const sdk = AdTogether.shared;
        const url = AdTogether.buildServeUrl(sdk, adUnitId, adType);

        const response = await fetch(url);
        if (response.status === 204) {
          // Server responded with 204 No Content (no ad available)
          throw new Error('AdTogether: No ad available.');
        }
        if (response.ok) {
          const ad = await response.json() as AdModel;
          if (adType && ad.adType !== adType) {
            throw new Error('Received an ad with a different type than requested: ' + (ad.adType ?? 'missing'));
          }
          AdTogether.adCache.set(cacheKey, {
            ad,
            expiresAt: Date.now() + AdTogether.AD_CACHE_TTL_MS,
          });
          sdk.lastAdId = ad.id;
          return ad;
        } else if (response.status === 401 || response.status === 403) {
          console.error('AdTogether Error: Invalid App ID. Please check your dashboard.');
          throw new Error(`AdTogether Error: Invalid App ID. Status: ${response.status}`);
        } else if (response.status === 429) {
          // The server told us to slow down. Record the backoff window
          // (persisted across reloads) so this client stops calling the
          // serve endpoint for the remainder of the rate-limit window.
          AdTogether.noteServerRateLimit(response);
          console.warn('AdTogether: server rate limit reached (429). Backing off.');
          throw new Error('AdTogether: Server rate limit reached (429). Backing off until the limit window resets.');
        }

        throw new Error(`Failed to fetch ad. Status: ${response.status}`);
      } finally {
        AdTogether.inflightRequests.delete(cacheKey);
      }
    })();

    AdTogether.inflightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Whether a server-issued rate-limit backoff window is currently active.
   * The window is rehydrated from sessionStorage so a page reload or a new
   * tab never resets an in-progress backoff.
   */
  private static isServerRateLimited(): boolean {
    if (AdTogether.rateLimitedUntilMs > Date.now()) return true;

    let persisted = 0;
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage?.getItem(AdTogether.RATE_LIMIT_STORAGE_KEY);
        const parsed = raw ? Number.parseInt(raw, 10) : 0;
        persisted = Number.isFinite(parsed) && parsed > Date.now() ? parsed : 0;
      } catch {
        persisted = 0;
      }
    }

    AdTogether.rateLimitedUntilMs = persisted;
    return persisted > 0;
  }

  /**
   * Record a server rate-limit backoff window from a 429 response.
   * Honors the `Retry-After` header (delta-seconds or HTTP date) and clamps
   * the window to [1s, 24h], defaulting to 60s when the header is missing.
   */
  private static noteServerRateLimit(response?: Response): void {
    let backoffSeconds = AdTogether.DEFAULT_RATE_LIMIT_BACKOFF_MS / 1000;

    const header = response?.headers?.get('retry-after');
    if (header) {
      const asSeconds = Number.parseInt(header, 10);
      if (Number.isFinite(asSeconds) && asSeconds > 0) {
        backoffSeconds = asSeconds;
      } else {
        const asDate = Date.parse(header);
        if (!Number.isNaN(asDate)) {
          backoffSeconds = Math.max(1, Math.ceil((asDate - Date.now()) / 1000));
        }
      }
    }

    const until = Date.now() + Math.min(backoffSeconds, 86400) * 1000;
    AdTogether.rateLimitedUntilMs = until;

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage?.setItem(AdTogether.RATE_LIMIT_STORAGE_KEY, String(until));
      } catch {
        // Storage unavailable (private mode/SSR); in-memory backoff still applies.
      }
    }
  }

  private static buildServeUrl(sdk: AdTogether, adUnitId: string, adType?: AdType): string {
    const fallbackBaseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://www.ad-together.org';
    const url = new URL(sdk.baseUrl || fallbackBaseUrl, fallbackBaseUrl);
    url.pathname = url.pathname.replace(/\/+$/, '') + '/api/ads/serve';
    url.search = '';
    url.hash = '';

    url.searchParams.set('adUnitId', adUnitId);
    url.searchParams.set('appId', sdk.appId ?? '');
    url.searchParams.set('allowSelfAds', String(sdk.allowSelfAds));
    url.searchParams.set('platform', 'web');
    if (adType) {
      url.searchParams.set('adType', adType);
    }
    if (sdk.lastAdId) {
      url.searchParams.set('exclude', sdk.lastAdId);
    }
    if (sdk.bundleId) {
      url.searchParams.set('bundleId', sdk.bundleId);
    }
    if (typeof window !== 'undefined') {
      url.searchParams.set('sourceUrl', window.location.href);
    }

    return url.toString();
  }

  static trackImpression(adId: string, token?: string, viewability?: ViewabilityMetrics) {
    const sdk = AdTogether.shared;
    if (!sdk.assertInitialized()) return;
    if (AdTogether.isAutomatedBrowser()) return;

    // Guard against recording impressions beyond frequency cap
    const capCheck = sdk.frequencyCap.checkCap();
    if (!capCheck.allowed) {
      console.warn(`AdTogether: Impression skipped - frequency cap exceeded (${capCheck.reason}).`);
      return;
    }

    // Record this impression in the client frequency tracker
    sdk.frequencyCap.recordView();

    this.trackEvent('/api/ads/impression', adId, token, viewability);
  }

  static trackClick(adId: string, token?: string) {
    if (token) {
      if (this.clickedTokens.has(token)) return;
      this.clickedTokens.add(token);
      if (this.clickedTokens.size > 200) {
        const oldest = this.clickedTokens.values().next().value;
        if (oldest) this.clickedTokens.delete(oldest);
      }
    }
    this.trackEvent('/api/ads/click', adId, token);
  }

  /**
   * Get the current client-side frequency capping status (hourly and daily view counts).
   */
  static getFrequencyCapStatus(): FrequencyCapStatus {
    return AdTogether.shared.frequencyCap.getStatus();
  }

  /**
   * Reset client-side frequency capping counters.
   */
  static resetFrequencyCap(): void {
    AdTogether.shared.frequencyCap.reset();
  }

  private static trackEvent(endpoint: string, adId: string, token?: string, viewability?: ViewabilityMetrics) {
    if (!AdTogether.shared.assertInitialized()) return;

    // Bot guard: automated browsers must never send impression/click events.
    if (AdTogether.isAutomatedBrowser()) return;

    fetch(`${AdTogether.shared.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      keepalive: true,
      body: JSON.stringify({ 
        adId, 
        token, 
        appId: AdTogether.shared.appId,
        ...(AdTogether.shared.bundleId ? { bundleId: AdTogether.shared.bundleId } : {}),
        ...(endpoint === '/api/ads/impression' && typeof window !== 'undefined'
          ? { pagePath: window.location.pathname }
          : {}),
        ...(endpoint === '/api/ads/impression' && viewability ? viewability : {}),
        // Send platform and environment to match Flutter SDK
        platform: 'web',
        environment: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' ? 'development' : 'production',
      }),
    }).catch(console.error);
  }
}
