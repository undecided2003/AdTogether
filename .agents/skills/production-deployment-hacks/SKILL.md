---
name: production-deployment-hacks
description: Technical workarounds and conventions for Next.js bundling, Firebase Admin, Cloud Functions Server Actions, and ESM compatibility in AdTogether.
---

# Production Deployment Hacks (Next.js & Firebase)

This skill documents specific production workarounds and best practices used across the AdTogether Next.js and Firebase deployment setup.

## 1. Firebase Admin Bypass
- **Problem:** Next.js bundling often mangles `firebase-admin` imports or breaks native Node bindings.
- **Workaround:** Use `eval("require('firebase-admin')")` to force a native CommonJS require at runtime.
- **Reference:** [src/lib/firebase-admin.ts](file:///c:/Users/kevin/Next/AdTogether/src/lib/firebase-admin.ts)

## 2. Server Action Workarounds
- **Problem:** Serialization issues and cold start quirks when running Next.js Server Actions on Cloud Functions / serverless environments.
- **Workaround:** Prefer standard API routes (`/api/...`) over `use server` Server Actions for complex backend logic and SDK-facing endpoints.

## 3. ESM Compatibility
- **Problem:** ESM-only libraries crashing or failing resolution in CJS/mixed server environments.
- **Workaround:** Use zero-dependency pure JavaScript/Regex for parsing and data extraction (e.g., HTML/metadata extraction) rather than pulling in heavy ESM-only dependencies.

## 4. In-Memory Caching & Stale Snapshot Invariants
- **Active Ads Cache (`getCachedActiveAds`):** In-memory cache TTL is 60s. Always call `invalidateActiveAdsCache()` whenever campaign active state changes (create, edit, pause, resume, delete, and credit-policy auto-pause / auto-resume in impression transactions).
- **Publisher App ID Cache (`findPublisherByAppId`):** In-memory cache TTL is 4m (negative cache 60s). It returns a cached `QueryDocumentSnapshot` intended strictly for resolving App ID → Publisher UID/DocRef. **Never** reuse `publisher.data()` for read-modify-write updates on mutable metrics (such as `earningsLog` or `dailyClicks`), as doing so overwrites real-time impression counts with stale snapshot data. Always perform a fresh `publisherRef.get()` or use atomic updates.

## 5. Static Client Route Convention
- **Problem:** Dynamic route path parameters (e.g., `/edit-ad/[id]`) in Next.js App Router force server-side rendering (`ƒ Dynamic`), which triggers expensive Cloud Function / Cloud Run container invocations on every page navigation or refresh.
- **Workaround:** For authenticated client-side management screens, use query parameters (e.g., `/edit-ad?id=...`) wrapped in `<Suspense>` instead of dynamic path segments. This allows Next.js to compile the route as 100% static (`○`), letting Firebase CDN serve the HTML shell instantly at zero Cloud Function cost. Add permanent 301 redirects in `next.config.ts` for legacy path URLs.

## 6. Simple CORS Telemetry Optimization
- **Problem:** Sending `Content-Type: application/json` on cross-origin `POST` requests forces web browsers to issue an `OPTIONS` preflight request, doubling function calls for every web impression and click.
- **Workaround:** Send `Content-Type: text/plain` with `keepalive: true` in the Web SDK. Browsers treat this as a CORS simple request and skip the `OPTIONS` preflight entirely. On the server, use `await request.text()` and `JSON.parse()` to handle both `text/plain` and `application/json` transparently.

## 7. Cloud Run / Functions v2 Concurrency Tuning
- **Problem:** Default single-concurrency serverless deployments spin up a separate container instance for every concurrent request, leading to container bloat and cold start cascades.
- **Workaround:** Configure `"concurrency": 80` in `firebase.json` under `hosting.frameworksBackend`. A single warm container instance can handle dozens of simultaneous requests while sharing in-memory caches (`getCachedActiveAds`, `findPublisherByAppId`, `getCachedApiSecret`), reducing container count and cold starts by over 80%.

## 8. One-Step Deployment Script (`npm run deploy`)
- **Workflow:** Running `npm run deploy` automatically builds `@adtogether/web-sdk` (`npm --prefix sdk/web-sdk run build`) so distribution files are always up-to-date, and then invokes `npx firebase deploy --only hosting` to build Next.js, prerender static pages, deploy edge CDN caching headers, and update the Cloud Run function.

## 9. Direct-to-`run.app` Request Rejection
- **Problem:** The SSR Cloud Run service URL (`ssradtogether15453-*.run.app`) is public and receives constant internet scanner traffic that bypasses Firebase Hosting. Each hit still pays full Next.js routing/rendering cost (memory pressure, cold starts) even though it does zero database work.
- **Header invariant (verified empirically):** Hosting-forwarded requests carry `X-Forwarded-Host` (the original hosting domain); direct Cloud Run requests do not. The `Host` header is the `*.run.app` service URL in **both** cases, so it must never be used alone to discriminate — blocking on `Host` would 100% break real traffic.
- **Workaround:** [src/proxy.ts](file:///c:/Users/kevin/Next/AdTogether/src/proxy.ts) (Next.js 16 proxy convention) returns a bare 404 before any routing when `X-Forwarded-Host` is absent AND `Host` ends with `.run.app`. The check is fail-open: Hosting-forwarded requests (custom domain, `*.web.app`, preview channels) always carry the header and are never blocked. Invocation counts are unaffected; this is memory/latency relief and scanner hardening.


