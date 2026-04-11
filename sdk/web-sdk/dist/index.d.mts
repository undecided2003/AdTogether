interface AdModel {
    id: string;
    title: string;
    description: string;
    clickUrl?: string;
    imageUrl?: string;
    token?: string;
}
interface AdTogetherOptions {
    appId?: string;
    apiKey?: string;
    baseUrl?: string;
}

declare class AdTogether {
    private static instance;
    private appId?;
    baseUrl: string;
    private constructor();
    static get shared(): AdTogether;
    static initialize(options: AdTogetherOptions): void;
    assertInitialized(): boolean;
    static fetchAd(adUnitId: string): Promise<AdModel>;
    static trackImpression(adId: string, token?: string): void;
    static trackClick(adId: string, token?: string): void;
    private static trackEvent;
}

export { type AdModel, AdTogether, type AdTogetherOptions };
