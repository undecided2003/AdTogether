## 0.4.0
* **Security**: Standardized `appId` as the primary identifier across all platforms.
* **Deprecation**: Formally deprecated `apiKey` in favor of `appId` to align with the AdTogether dashboard.
* **Sync**: Version parity (0.4.0) across all AdTogether SDKs.

## 0.3.2
* **Docs**: Added official Model Context Protocol (MCP) server integration instructions to README.
* **Sync**: Version parity (0.3.2) across all AdTogether SDKs.

## 0.2.6
* **Sync**: Version parity across all AdTogether SDKs.

## 0.2.3
* **Sync**: Version parity across all AdTogether SDKs.

## 0.2.2
* **Domain**: Updated base API domain to `www.ad-together.org`.

## 0.2.0
* **Security**: Implemented strict validation for required parameters and API keys.
* **Error Handling**: Improved error handling for invalid or missing App IDs across all platforms, ensuring graceful failures with descriptive logs.

## 0.1.25
* **Docs**: Standardized SDK documentation across all platforms.

## 0.1.23

* **Sync**: Version parity across all AdTogether SDKs.

## 0.1.22
* **Brand**: Added "Powered by AdTogether" attribution to all Interstitial ad formats.
* **Sync**: Unified versioning (0.1.20) across all AdTogether SDKs.

## 0.1.14

* **Feature**: Added `onAdClosed` callback support to banner components.
* **Feature**: Improved automatic `bundleId` detection across all platforms.
* **Security**: Hardened ad-serving logic to prevent payout fraud.
* **Sync**: Version parity across all AdTogether SDKs.

## 0.1.12

* **Feature**: Added `showCloseButton` to `AdTogetherBanner`.
* **Standardization**: Support for `onAdLoaded` and `onAdFailedToLoad` with unified naming conventions.
* **Layout**: Enhanced responsiveness and safe area handling.

## 0.1.9

* **Feature**: Added `onAdLoaded` and `onAdFailedToLoad` callback support to both `AdTogetherBanner` and `AdTogetherInterstitial`.
* **Responsive**: Implemented orientation-aware layouts for Interstitial ads to prevent overflow in landscape mode.
* **Standardization**: Updated API signatures to match the unified AdTogether SDK standard across all platforms.

## 0.1.0

* Initial release of the AdTogether React Native SDK.

