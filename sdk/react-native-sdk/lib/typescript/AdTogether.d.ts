import { AdModel, AdType, AdTogetherOptions } from './types';
export declare class AdTogether {
    private static instance;
    private appId?;
    private bundleId?;
    private allowSelfAds;
    baseUrl: string;
    private constructor();
    static get shared(): AdTogether;
    /**
     * Attempts to auto-detect the app's bundle/package identifier.
     * Tries multiple sources in order:
     * 1. expo-application (if Expo is available)
     * 2. react-native-device-info (if installed)
     * 3. RN's built-in PlatformConstants (Android only)
     */
    private static tryAutoDetectBundleId;
    static initialize(options: AdTogetherOptions): void;
    assertInitialized(): boolean;
    private lastAdId?;
    static fetchAd(adUnitId: string, adType?: AdType): Promise<AdModel>;
    static trackImpression(adId: string, token?: string): void;
    static trackClick(adId: string, token?: string): void;
    private static trackEvent;
}
//# sourceMappingURL=AdTogether.d.ts.map