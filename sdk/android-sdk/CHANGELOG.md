## 0.2.8
* **Fix**: Removed unreliable `pgp.mit.edu` keyserver from CI pipeline and added timeouts to prevent build hanging during GPG key propagation.

## 0.2.7
* **Fix**: Resolved Maven Central PGP signature verification failures with robust keyserver upload retries, extended propagation wait, and pre-publish key retrieval verification.

## 0.2.6
* **Fix**: Enhanced GPG key distribution with multiple keyservers and propagation delay.
* **Sync**: Version parity across all AdTogether SDKs.

## 0.2.3
* **Fix**: Automated GPG public key publication to keyservers during CI/CD.
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
* **Fix**: Resolved compilation errors in Jetpack Compose views (missing `sp` import and state variables).
* **Sync**: Version parity across all AdTogether SDKs.

## 0.1.12

* **Feature**: Added `showCloseButton` to `AdTogetherBanner`.
* **Standardization**: Support for `onAdLoaded` and `onAdFailedToLoad` with unified naming conventions.
* **Layout**: Improved landscape mode responsiveness for banner and interstitial views.

## 0.1.11

* **Fix**: Enabled GPG signing for Maven Central publication.
* **Feature**: Added `AdTogetherBanner` alias for cross-platform naming parity.
* **Standardization**: Updated API signatures to match the unified AdTogether SDK standard across all platforms.

## 0.1.7

* Documentation improvements.
* Localize ad assets for better registry rendering.
* Update Discord invite link to https://discord.gg/maA8g4ADpk.

## 0.1.4

* Update repository URLs and project structure.

## 0.1.1

* Update repository URLs to new organization.
* Prepare for version 0.1.1 release.

## 0.1.0

* Initial release of the AdTogether Android SDK.
