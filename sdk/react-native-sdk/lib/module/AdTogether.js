"use strict";

import { NativeModules, Platform } from 'react-native';
export class AdTogether {
  allowSelfAds = true;
  baseUrl = 'https://www.ad-together.org';
  constructor() {}
  static get shared() {
    if (!AdTogether.instance) {
      AdTogether.instance = new AdTogether();
    }
    return AdTogether.instance;
  }

  /**
   * Attempts to auto-detect the app's bundle/package identifier.
   * Tries multiple sources in order:
   * 1. expo-application (if Expo is available)
   * 2. react-native-device-info (if installed)
   * 3. RN's built-in PlatformConstants (Android only)
   */
  static tryAutoDetectBundleId() {
    // 1. Try expo-application (works in Expo and bare RN with expo modules)
    try {
      const ExpoApplication = require('expo-application');
      if (ExpoApplication?.applicationId) {
        return ExpoApplication.applicationId;
      }
    } catch (_) {
      // expo-application not available
    }

    // 2. Try react-native-device-info (popular community module)
    try {
      const DeviceInfo = require('react-native-device-info');
      if (DeviceInfo?.getBundleId) {
        return DeviceInfo.getBundleId();
      }
    } catch (_) {
      // react-native-device-info not available
    }

    // 3. Try RN's built-in PlatformConstants (Android exposes package name)
    try {
      if (Platform.OS === 'android') {
        const constants = NativeModules.PlatformConstants;
        if (constants?.reactNativeVersion) {
          // On Android, the ServerHost module sometimes exposes the package name
          const appModule = NativeModules.RNDeviceInfo || NativeModules.AppInfo;
          if (appModule?.bundleId) {
            return appModule.bundleId;
          }
        }
      }
    } catch (_) {
      // PlatformConstants not available
    }
    return undefined;
  }
  static initialize(options) {
    const sdk = AdTogether.shared;
    sdk.appId = options.apiKey || options.appId;
    if (options.bundleId) {
      sdk.bundleId = options.bundleId;
    } else {
      // Auto-detect bundleId from available native modules
      sdk.bundleId = AdTogether.tryAutoDetectBundleId();
      if (!sdk.bundleId) {
        console.warn('AdTogether: Could not auto-detect bundleId. ' + 'For best results, provide bundleId in initialize() options, ' + 'or install expo-application or react-native-device-info.');
      }
    }
    if (options.allowSelfAds !== undefined) {
      sdk.allowSelfAds = options.allowSelfAds;
    }
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    }
    console.log(`AdTogether SDK Initialized with App ID: ${sdk.appId}${sdk.bundleId ? `, Bundle ID: ${sdk.bundleId}` : ''}`);
  }
  assertInitialized() {
    if (!this.appId) {
      console.error('AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.');
      return false;
    }
    return true;
  }
  static async fetchAd(adUnitId = 'default', adType) {
    if (!AdTogether.shared.assertInitialized()) {
      throw new Error('AdTogether not initialized');
    }
    try {
      const sdk = AdTogether.shared;
      let url = `${sdk.baseUrl}/api/ads/serve?country=global&adUnitId=${adUnitId}&apiKey=${sdk.appId}`;
      if (adType) {
        url += `&adType=${adType}`;
      }
      if (sdk.lastAdId) {
        url += `&exclude=${sdk.lastAdId}`;
      }
      if (sdk.bundleId) {
        url += `&bundleId=${sdk.bundleId}`;
      }

      // Pass allowSelfAds (removed platform from fetch URL to match other SDKs)
      url += `&allowSelfAds=${sdk.allowSelfAds}`;
      const response = await fetch(url);
      if (response.ok) {
        const ad = await response.json();
        sdk.lastAdId = ad.id;
        return ad;
      } else if (response.status === 401 || response.status === 403) {
        console.error('AdTogether Error: Invalid App ID. Please check your dashboard.');
        throw new Error(`AdTogether Error: Invalid App ID. Status: ${response.status}`);
      }
      throw new Error(`Failed to fetch ad. Status: ${response.status}`);
    } catch (err) {
      throw err;
    }
  }
  static trackImpression(adId, token) {
    this.trackEvent('/api/ads/impression', adId, token);
  }
  static trackClick(adId, token) {
    this.trackEvent('/api/ads/click', adId, token);
  }

  /**
   * Detect country code from the device locale.
   * Tries expo-localization first, then NativeModules, then Intl API.
   */
  static detectCountry() {
    // 1. Try expo-localization
    try {
      const ExpoLocalization = require('expo-localization');
      if (ExpoLocalization?.region) {
        return ExpoLocalization.region; // e.g. "US"
      }
      // expo-localization v3+ uses getLocales()
      if (ExpoLocalization?.getLocales) {
        const locales = ExpoLocalization.getLocales();
        if (locales?.[0]?.regionCode) {
          return locales[0].regionCode;
        }
      }
    } catch (_) {}

    // 2. Try RN NativeModules (I18nManager or SettingsManager)
    try {
      if (Platform.OS === 'ios') {
        const settings = NativeModules.SettingsManager?.settings;
        const locale = settings?.AppleLocale || settings?.AppleLanguages?.[0];
        if (locale) {
          const parts = locale.replace('_', '-').split('-');
          if (parts.length >= 2) {
            const region = parts[parts.length - 1].toUpperCase();
            if (region.length === 2) return region;
          }
        }
      } else if (Platform.OS === 'android') {
        const locale = NativeModules.I18nManager?.localeIdentifier;
        if (locale) {
          const parts = locale.replace('_', '-').split('-');
          if (parts.length >= 2) {
            const region = parts[parts.length - 1].toUpperCase();
            if (region.length === 2) return region;
          }
        }
      }
    } catch (_) {}

    // 3. Fallback: Intl API (available in Hermes & JSC)
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const resolved = Intl.DateTimeFormat().resolvedOptions();
        if (resolved.locale) {
          const parts = resolved.locale.split('-');
          if (parts.length >= 2) {
            const region = parts[parts.length - 1].toUpperCase();
            if (region.length === 2) return region;
          }
        }
      }
    } catch (_) {}
    return null;
  }
  static trackEvent(endpoint, adId, token) {
    if (!AdTogether.shared.assertInitialized()) return;
    fetch(`${AdTogether.shared.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adId,
        token,
        apiKey: AdTogether.shared.appId,
        ...(AdTogether.shared.bundleId ? {
          bundleId: AdTogether.shared.bundleId
        } : {}),
        // Send platform and environment to match Flutter SDK
        platform: Platform.OS,
        environment: __DEV__ ? 'development' : 'production',
        country: AdTogether.detectCountry()
      })
    }).catch(console.error);
  }
}
//# sourceMappingURL=AdTogether.js.map