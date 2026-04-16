import { AdModel, AdType, AdTogetherOptions } from './types';
export declare class AdTogether {
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
//# sourceMappingURL=AdTogether.d.ts.map