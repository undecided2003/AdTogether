import { FrequencyCapOptions, FrequencyCapStatus } from './types';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class FrequencyCap {
  public enabled: boolean;
  public maxPerHour: number;
  public maxPerDay: number;
  private appId?: string;
  private inMemoryTimestamps: number[] = [];

  constructor(options: {
    enabled?: boolean;
    maxPerHour?: number;
    maxPerDay?: number;
    appId?: string;
  } = {}) {
    this.enabled = options.enabled ?? true;
    this.maxPerHour = options.maxPerHour ?? 3;
    this.maxPerDay = options.maxPerDay ?? 12;
    this.appId = options.appId;
  }

  private getStorageKey(): string {
    const safeAppId = this.appId ? this.appId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    return `adtogether_fc_${safeAppId}`;
  }

  /**
   * Safely read view timestamps from localStorage (with in-memory fallback).
   * Automatically prunes timestamps older than 24 hours.
   */
  private getTimestamps(now: number = Date.now()): number[] {
    let timestamps: number[] = [];

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(this.getStorageKey());
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            timestamps = parsed.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
          }
        }
      } catch (e) {
        // Fallback to in-memory on localStorage access errors (e.g. private browsing or quota exceeded)
        timestamps = [...this.inMemoryTimestamps];
      }
    } else {
      timestamps = [...this.inMemoryTimestamps];
    }

    // Discard entries older than 24h or in the future
    const oneDayAgo = now - ONE_DAY_MS;
    const pruned = timestamps.filter(ts => ts > oneDayAgo && ts <= now + 60000);

    // If pruned count changed from stored, sync back
    if (pruned.length !== timestamps.length) {
      this.saveTimestamps(pruned);
    } else {
      this.inMemoryTimestamps = pruned;
    }

    return pruned;
  }

  /**
   * Safely persist view timestamps to localStorage and memory.
   */
  private saveTimestamps(timestamps: number[]): void {
    this.inMemoryTimestamps = timestamps;

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(this.getStorageKey(), JSON.stringify(timestamps));
      } catch (e) {
        // LocalStorage write failed (e.g. quota exceeded or cookies blocked)
      }
    }
  }

  /**
   * Check whether an ad view is permitted under the current hourly and daily limits.
   */
  checkCap(now: number = Date.now()): {
    allowed: boolean;
    reason?: 'hourly_limit_reached' | 'daily_limit_reached';
    hourlyViews: number;
    dailyViews: number;
    maxPerHour: number;
    maxPerDay: number;
  } {
    if (!this.enabled) {
      return {
        allowed: true,
        hourlyViews: 0,
        dailyViews: 0,
        maxPerHour: this.maxPerHour,
        maxPerDay: this.maxPerDay,
      };
    }

    const timestamps = this.getTimestamps(now);
    const oneHourAgo = now - ONE_HOUR_MS;

    const hourlyViews = timestamps.filter(ts => ts > oneHourAgo).length;
    const dailyViews = timestamps.length;

    // Check hourly limit
    if (this.maxPerHour > 0 && Number.isFinite(this.maxPerHour) && hourlyViews >= this.maxPerHour) {
      return {
        allowed: false,
        reason: 'hourly_limit_reached',
        hourlyViews,
        dailyViews,
        maxPerHour: this.maxPerHour,
        maxPerDay: this.maxPerDay,
      };
    }

    // Check daily limit
    if (this.maxPerDay > 0 && Number.isFinite(this.maxPerDay) && dailyViews >= this.maxPerDay) {
      return {
        allowed: false,
        reason: 'daily_limit_reached',
        hourlyViews,
        dailyViews,
        maxPerHour: this.maxPerHour,
        maxPerDay: this.maxPerDay,
      };
    }

    return {
      allowed: true,
      hourlyViews,
      dailyViews,
      maxPerHour: this.maxPerHour,
      maxPerDay: this.maxPerDay,
    };
  }

  /**
   * Record a viewed ad impression in the frequency tracker.
   */
  recordView(now: number = Date.now()): void {
    if (!this.enabled) return;

    const timestamps = this.getTimestamps(now);
    timestamps.push(now);
    this.saveTimestamps(timestamps);
  }

  /**
   * Get the current status of frequency capping.
   */
  getStatus(now: number = Date.now()): FrequencyCapStatus {
    const check = this.checkCap(now);
    return {
      hourlyViews: check.hourlyViews,
      dailyViews: check.dailyViews,
      maxPerHour: check.maxPerHour,
      maxPerDay: check.maxPerDay,
      isCapped: !check.allowed,
      reason: check.reason,
    };
  }

  /**
   * Reset frequency capping storage and in-memory counters.
   */
  reset(): void {
    this.inMemoryTimestamps = [];
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.removeItem(this.getStorageKey());
      } catch (e) {
        // Ignore storage errors
      }
    }
  }
}
