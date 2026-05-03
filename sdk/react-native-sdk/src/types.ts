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
  /** The unique identifier for your application. */
  appId?: string;
  /** @deprecated Use appId instead */
  apiKey?: string;
  baseUrl?: string;
  bundleId?: string;
  /** Whether to show your own ads as fallback if no external ads are available. Defaults to true. */
  allowSelfAds?: boolean;
}

