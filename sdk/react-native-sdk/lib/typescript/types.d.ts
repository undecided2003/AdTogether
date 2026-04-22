export type AdType = 'banner' | 'interstitial';
export interface AdModel {
    id: string;
    title: string;
    description: string;
    clickUrl?: string;
    imageUrl?: string;
    token?: string;
    adType?: AdType;
}
export interface AdTogetherOptions {
    appId?: string;
    apiKey?: string;
    baseUrl?: string;
    bundleId?: string;
    /** Whether to show your own ads as fallback if no external ads are available. Defaults to true. */
    allowSelfAds?: boolean;
}
//# sourceMappingURL=types.d.ts.map