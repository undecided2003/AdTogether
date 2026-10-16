type AdType = 'banner' | 'interstitial';
interface ViewabilityMetrics {
    visiblePercent: number;
    visibleDurationMs: number;
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
interface AdTogetherOptions {
    /** The unique identifier for your application. */
    appId?: string;
    /** @deprecated Use appId instead */
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
    private static buildServeUrl;
    static trackImpression(adId: string, token?: string, viewability?: ViewabilityMetrics): void;
    static trackClick(adId: string, token?: string): void;
    private static trackEvent;
}

export { type AdModel, AdTogether, type AdTogetherOptions, type AdType, type ViewabilityMetrics };
