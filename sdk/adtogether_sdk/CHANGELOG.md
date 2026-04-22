## 0.1.22

* **Brand**: Added "Powered by AdTogether" attribution to all Interstitial ad formats across all platforms.
* **Sync**: Unified versioning (0.1.20) across all AdTogether SDKs (Android, iOS, Web, React Native, and Flutter).

## 0.1.17

* **Fix**: Updated interstitial ad image rendering to use `BoxFit.contain` with a background color instead of `BoxFit.cover`. This ensures ad images are no longer cropped and maintain their intended aspect ratio.

## 0.1.16

* **Fix**: Achieved 100% WASM compatibility by isolating transitive `dart:io` dependencies.
* **Fix**: Improved platform detection logic using conditional imports.

## 0.1.15

* **Brand**: Added official AdTogether logo to package metadata and README.

## 0.1.14

* **Feature**: Added `onAdClosed` callback support to banner components.
* **Feature**: Improved automatic `bundleId` detection across all platforms.
* **Security**: Hardened ad-serving logic to prevent payout fraud.
* **Sync**: Version parity across all AdTogether SDKs.
* **Maintenance**: Sync with updated underlying Android and iOS native components.

## 0.1.12

* **Feature**: Added `showCloseButton` to `AdTogetherBanner`.
* **Standardization**: Support for `onAdLoaded` and `onAdFailedToLoad` across all platform widgets.
* **Layout**: Better responsive behavior in landscape mode for both Banner and Interstitial ads.

## 0.1.11

* **Fix**: Resolved "yellow underline" rendering issue in both Banner and Interstitial widgets by ensuring correct theme inheritance.
* **Layout**: Improved landscape mode constraints and scrollable area handling for Interstitial ads on small screens.

## 0.1.9

* **Feature**: Added `onAdLoaded` and `onAdFailedToLoad` callback support to both `AdTogetherBanner` and `AdTogetherInterstitial`.
* **Responsive**: Implemented orientation-aware layouts for Interstitial ads to prevent overflow in landscape mode.
* **Standardization**: Updated API signatures to match the unified AdTogether SDK standard across all platforms.

## 0.1.7

* **Documentation**: Embedded local preview images directly in the package to ensure proper visual rendering on pub.dev.
* **Support**: Updated the AdTogether Discord community link.

## 0.1.4

* **Documentation**: Standardized value proposition and tagline terminology ("Show an ad, get an ad shown").

## 0.1.3

* **Fix**: Updated repository and issue tracker URLs to correct GitHub path (`undecided2003/AdTogether`).
* **Maintenance**: Corrected documentation links that were resulting in 404 errors.

## 0.1.2

* **Documentation Hub**: Rewrote README to be a comprehensive documentation hub with detailed API tables and lifecycle guides.
* **Example App**: Added a full-featured Flutter example app in `example/` demonstrating Banner and Interstitial integration.
* **API Polish**: Optimized map literal performance using Dart 3 null-aware elements.
* **Ready for Publish**: Final verification for pub.dev release, including all required fields and metadata.

## 0.1.0

* Initial release of the AdTogether Flutter SDK.
