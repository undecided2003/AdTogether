export interface AdModel {
  id: string;
  title: string;
  description: string;
  clickUrl?: string;
  imageUrl?: string;
}

export interface AdTogetherOptions {
  appId: string;
  baseUrl?: string;
}
