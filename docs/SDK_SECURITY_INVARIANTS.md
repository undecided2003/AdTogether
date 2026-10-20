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
- The `/api/ads/serve` route issues a cryptographically signed impression token bound to the ad, ad type, App ID, publisher account, and country observed by the configured hosting ingress. `TRUSTED_GEO_PROVIDER` selects exactly one provider header; never fall back across Vercel, Cloudflare, and App Engine headers. Ad targeting and credit tiering must use that server-observed country, never a caller-supplied country. If trusted geo is unavailable, use the lowest credit tier and serve only global campaigns. A country change between serve and impression is recorded as a risk signal; it does not change the billable country.
- Tokens expire after 15 minutes. `/api/ads/impression` verifies the signature and consumes each token nonce once in the same Firestore transaction that records the impression and changes credits. Replays must never earn or spend credits again.
- Grants require web viewability by default. A missing `Origin`, `Referer`, or client platform field must never waive it. The only exemption is a signed native provider requirement whose Play Integrity or App Attest proof has verified. The server requires at least one second between serving every token and accepting the impression, including native-attested traffic. Client-reported web visibility remains a screening signal, and must be consistent with server-measured elapsed time; it is not proof that the page element was visible.
- `/api/ads/click` verifies the same signed token format so impression security changes do not break click tracking.
- The impression transaction must re-read the campaign and reject inactive campaigns before consuming a grant, changing an App Attest counter, or changing either balance. A grant issued before a pause must never outlive the pause.
- Client Firestore rules must deny reads and writes to `config`, `impressionGrants`, attestation records, and all credit-bearing server fields. In particular, the client must never be able to replace `config/secrets`, mutate credits, or claim an existing App ID. The one initial 75-credit profile creation requires a Firebase-authenticated, email-verified account. Account-level API routes, MCP access, profile access, and ad-image uploads require that same verification; App ID creation and changes use a verified server route.
- Firestore TTL is configured for consumed grant documents through `firestore.indexes.json`; deploy the Firestore rules and index configuration with backend changes so replay records stay protected and expired records are eventually removed.
- Public serve, impression, and click requests use a durable fixed-window limit keyed by endpoint, App ID, and a client IP supplied by the explicitly configured ingress. Generic forwarding headers are never trusted. When that ingress identity is unavailable, a bounded process-local App-ID/source fallback can prevent accidental loops but is not a fraud-control identity. Keep the `publicAdRateLimits` collection server-only and deploy its TTL index with the other fraud-control records. The soft 3/hr, 12/day web view-frequency cap may additionally be keyed by an App ID + client IP + hashed User-Agent fingerprint so real users behind carrier-grade NAT keep independent view quotas; it complements but never replaces the IP-keyed durable limits above.

## 3. Native App Attestation
- Native impression grants may require Android Play Integrity or Apple App Attest. The provider and app identifier are read from the Admin-only `nativeAttestationApps` collection and signed into the impression token; client-supplied platform, bundle ID, country values, or missing browser headers never enable or waive the requirement.
- Play Integrity requests bind the Google verdict to the exact signed impression token through `requestHash`. The server checks the decoded package name, request hash, timestamp, `PLAY_RECOGNIZED`, `LICENSED`, and `MEETS_DEVICE_INTEGRITY` verdicts before the impression transaction runs.
- App Attest keys are registered against a one-time server challenge. Impression assertions cover the signed grant token, and the server advances each key's monotonic counter in the same transaction that consumes the impression grant. Current Apple extension data must be parsed and retained as risk-audit metadata.
- Configuration, App Attest keys, one-time challenges, and durable attestation rate-limit records must remain unavailable to client Firestore reads and writes. Keep these collections excluded from the client rules and deploy their TTL indexes.
- Attestation indicates a genuine app instance and supported device state; it does not prove a human saw an ad. It complements web viewability signals and server-side credit controls.
- Enable enforcement only after the matching SDK and platform setup are ready. See `docs/NATIVE_APP_ATTESTATION.md` for the Admin-only configuration record and rollout steps.
