export interface AdModel {
  id: string;
  title: string;
  description: string;
  clickUrl?: string;
  imageUrl?: string;
  token?: string;
}

export interface AdTogetherOptions {
  appId?: string;
  apiKey?: string;
  baseUrl?: string;
}
