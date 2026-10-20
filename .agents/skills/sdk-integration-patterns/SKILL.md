---
name: sdk-integration-patterns
description: Integration patterns, best practices, and example usage for @adtogether/web-sdk and other AdTogether client SDKs.
---

# AdTogether SDK Integration Patterns

Best practices and patterns for integrating AdTogether client SDKs.

## Example Integration
For a full-featured example of the `@adtogether/web-sdk` in a Next.js client component, see [ExampleAdsButton.tsx](file:///c:/Users/kevin/Next/AdTogether/src/components/ExampleAdsButton.tsx).

## Key Learnings & Rules
1. **Initialization:** Always call `AdTogether.initialize({ appId, bundleId })` in a `useEffect` on the client.
2. **Banner Props:** Use `showCloseButton={true}` and `onAdClosed` to handle user dismissals.
3. **Interstitial Logic:** Control visibility via `isOpen` and `onClose` props.
4. **Ad Units:** Use descriptive unit IDs like `example_banner` or `example_interstitial`.
5. **Security Invariant:** Ensure banners explicitly set `adType: 'banner'` and never fetch or render interstitial ads (see [SDK_SECURITY_INVARIANTS.md](file:///c:/Users/kevin/Next/AdTogether/docs/SDK_SECURITY_INVARIANTS.md)).
6. **Frequency Capping:** The Web SDK enforces client-side rolling view limits (default 3/hr and 12/day via `localStorage`) to prevent runaway impressions and reduce Firebase reads. Configurable via `maxViewsPerHour` / `maxViewsPerDay` in `AdTogether.initialize`.
7. **Pre-fetching & In-Memory Caching:** The Web SDK maintains an automatic 60s in-memory cache, coalesces concurrent in-flight requests, and honors server `Retry-After` backoff on HTTP 429 (persisted in `sessionStorage`, so capped clients stop re-hitting the serve endpoint). Use `AdTogether.prefetchAd(adUnitId?, adType?)` to pre-warm ads before showing interstitials or during route transitions without triggering redundant network calls.
8. **CORS Simple Requests:** The Web SDK sends tracking payloads (`/api/ads/impression`, `/api/ads/click`) with `'Content-Type': 'text/plain'` and `keepalive: true` to prevent browser `OPTIONS` preflight round-trips while guaranteeing delivery during page unmounts.

