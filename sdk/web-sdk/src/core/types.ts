export type AdType = 'banner' | 'interstitial';

export interface ViewabilityMetrics {
  visiblePercent: number;
  visibleDurationMs: number;
  containerWidth?: number;
  containerHeight?: number;
}

export interface AdModel {
  id: string;
  title: string;
  description: string;
  clickUrl?: string;
  imageUrl?: string;
  token?: string;
  adType?: AdType;
}

export interface FrequencyCapOptions {
  /**
   * Maximum number of ad views allowed per rolling hour.
   * Defaults to 3. Set to 0 or Infinity to disable hourly capping.
   */
  maxPerHour?: number;
  /**
   * Maximum number of ad views allowed per rolling 24-hour day.
   * Defaults to 12. Set to 0 or Infinity to disable daily capping.
   */
  maxPerDay?: number;
  /**
   * Whether client-side frequency capping is enabled. Defaults to true.
   */
  enabled?: boolean;
}

export interface FrequencyCapStatus {
  hourlyViews: number;
  dailyViews: number;
  maxPerHour: number;
  maxPerDay: number;
  isCapped: boolean;
  reason?: 'hourly_limit_reached' | 'daily_limit_reached';
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
  /**
   * Frequency capping configuration to limit impressions per user across rolling hour and day windows.
   */
  frequencyCap?: FrequencyCapOptions;
  /** Shorthand: Maximum number of ad views allowed per rolling hour. Defaults to 3. */
  maxViewsPerHour?: number;
  /** Shorthand: Maximum number of ad views allowed per rolling 24-hour day. Defaults to 12. */
  maxViewsPerDay?: number;
  /** Shorthand: Whether frequency capping is enabled. Defaults to true. */
  enableFrequencyCap?: boolean;
}

