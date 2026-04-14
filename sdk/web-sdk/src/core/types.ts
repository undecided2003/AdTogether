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
}
