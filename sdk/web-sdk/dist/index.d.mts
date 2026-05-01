type AdType = 'banner' | 'interstitial';
interface AdModel {
    id: string;
    title: string;
    description: string;
    clickUrl?: string;
    imageUrl?: string;
    token?: string;
    adType?: AdType;
}
interface AdTogetherOptions {
    appId?: string;
    apiKey?: string;
    baseUrl?: string;
    bundleId?: string;
    /** Whether to show your own ads as fallback if no external ads are available. Defaults to true. */
    allowSelfAds?: boolean;
}

declare class AdTogether {
    private static instance;
    private appId?;
    private bundleId?;
    private allowSelfAds;
    baseUrl: string;
    private constructor();
    static get shared(): AdTogether;
    static initialize(options: AdTogetherOptions): void;
    assertInitialized(): boolean;
    private lastAdId?;
    static fetchAd(adUnitId?: string, adType?: AdType): Promise<AdModel>;
    static trackImpression(adId: string, token?: string): void;
    static trackClick(adId: string, token?: string): void;
    /**
     * Detect the user's country code from the browser locale.
     * Uses Intl API (most reliable) with navigator.language as fallback.
     * Returns an ISO 3166-1 alpha-2 code like "US", "DE", "JP", or null.
     */
    private static detectCountry;
    private static trackEvent;
}

export { type AdModel, AdTogether, type AdTogetherOptions, type AdType };
