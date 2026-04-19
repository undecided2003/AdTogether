# SDK Security & Architecture Invariants

This document outlines critical architectural decisions and security measures that must be preserved during updates to the AdTogether SDKs or backend.

## 1. Ad Type Enforcement (Banner vs. Interstitial)

### The Invariant
Standard Banner components must **always** explicitly request `adType: 'banner'` when fetching ads from the backend. They must never use the default fetch behavior without a type.

### The Reason
Interstitial ads pay out 5x more than Banner ads. If a Banner component fetches an ad without specifying a type, it might receive an Interstitial ad. This results in:
- **Advertiser Overcharge:** The advertiser pays for an Interstitial (full-screen) but only gets a Banner placement.
- **Publisher Exploit:** A publisher could (accidentally or intentionally) earn Interstitial rates while only showing small banners.

### Implementation Status
- **Backend:** `src/app/api/ads/serve/route.ts` strictly filters by `adType` and defaults to `'banner'` if none is provided.
- **SDKs:** All platforms (Web, Flutter, iOS, Android, React Native) have been updated to explicitly pass `'banner'` in their banner/view widgets.

### Maintenance Rule
When adding new SDK platforms or modifying existing ones:
- **NEVER** allow a banner-style widget to call the fetch API without explicitly specifying `adType: 'banner'`.
- **NEVER** loosen the backend filtering in `/api/ads/serve` that separates these types.

## 2. Impression Verification
- Impression tracking requires a cryptographically signed `token` generated during the `serve` phase.
- The `/api/ads/impression` route verifies this token using `API_SECRET` to prevent fake impression spam.
