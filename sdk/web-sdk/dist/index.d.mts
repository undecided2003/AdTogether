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
    /** Whether to show your own ads as fallback if no external ads are available. Defaults to true. */
    allowSelfAds?: boolean;
}

declare class AdTogether {
    private static instance;
    private appId?;
    private allowSelfAds;
    baseUrl: string;
    private constructor();
    static get shared(): AdTogether;
    static initialize(options: AdTogetherOptions): void;
    assertInitialized(): boolean;
    private lastAdId?;
    static fetchAd(adUnitId: string, adType?: AdType): Promise<AdModel>;
    static trackImpression(adId: string, token?: string): void;
    static trackClick(adId: string, token?: string): void;
    private static trackEvent;
}

export { type AdModel, AdTogether, type AdTogetherOptions, type AdType };
