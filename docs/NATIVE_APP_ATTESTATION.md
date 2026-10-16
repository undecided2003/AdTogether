# Native App Attestation

The ad server can require Google Play Integrity for Android or Apple App Attest for an iOS App ID. When enforcement is enabled, the serve route signs the provider and registered application identifier into each impression grant. The impression route verifies a proof bound to that exact grant before it changes either account's credits.

## Eligibility baseline

Client-provided country, platform, visibility, and duration fields are signals rather than proof. The server prices a grant from its trusted ingress country and measures the grant age itself.

Every signed grant must be at least one second old before it can be credited, including grants with a verified native proof. Every grant requires the web viewability gate by default. A grant can bypass that gate only when its signed native provider proof verifies successfully. A missing browser header never identifies a request as native traffic.

Web viewability telemetry is useful screening evidence but cannot prove a human saw an ad. Enable the matching native enforcement record for every Android or iOS App ID that needs fraud-resistant credit eligibility. Do not share an enforced App ID with a web, React Native, Flutter, REST, or other SDK that cannot submit the required proof.

## SDK coverage

| SDK | Native proof support | Enforcement status |
| --- | --- | --- |
| Android Kotlin SDK 0.5.6+ | Play Integrity | Supported |
| iOS Swift SDK 0.5.6+ | Apple App Attest on iOS | Supported |
| iOS SDK on macOS | None | Keep enforcement off |
| React Native | None | Keep enforcement off |
| Flutter | None | Keep enforcement off |
| Web / REST | None | Use web viewability only |

## Trusted location

Set `TRUSTED_GEO_PROVIDER` to the one ingress that injects and strips the selected country and client-IP headers:

| Value | Country header | Client-IP header |
| --- | --- | --- |
| `vercel` | `x-vercel-ip-country` | `x-vercel-forwarded-for` |
| `cloudflare` | `cf-ipcountry` | `cf-connecting-ip` |
| `appengine` | `x-appengine-country` | `x-appengine-user-ip` |

Leave it unset until the deployment path is verified. An unset or invalid value causes the server to use the lowest tier and only global targeting, and leaves public endpoint limiting on a bounded local App-ID/source fallback. That fallback prevents accidental loops but cannot identify a caller reliably. Configure a trusted ingress in production so the durable per-App-ID, per-client-IP limit can operate across instances. If a CDN is selected, restrict direct origin access so callers cannot supply those headers themselves.

## Configure an App ID

Create a document in the Admin-only `nativeAttestationApps` collection. The document ID is the lowercase SHA-256 hex digest of the App ID:

```sh
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "YOUR_APP_ID"
```

Include the exact `appId` and the publisher's Firestore user document ID as `publisherUid`. The server validates both against the existing publisher registration. Firestore client rules deny every read and write to this collection.

### Android

```json
{
  "appId": "YOUR_APP_ID",
  "publisherUid": "FIRESTORE_USER_UID",
  "enabled": true,
  "provider": "play-integrity",
  "bundleId": "com.example.app",
  "playIntegrityProjectNumber": "123456789012"
}
```

`playIntegrityProjectNumber` must equal the deployment's `PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER` environment variable. Link that shared Cloud project to the Android app in Play Console, enable Play Integrity, and run the backend with a service account in that linked Cloud project. The server rejects an enabled Android record that does not match the deployment project number.

The Android SDK warms and reuses a Standard Integrity provider, and requests a token bound to the served grant. The server accepts only a matching package name, request hash, recent timestamp, `PLAY_RECOGNIZED`, `LICENSED`, and `MEETS_DEVICE_INTEGRITY` verdict.

Review the Play Integrity quota for the linked Cloud project and set monitoring or a quota increase before enabling attestation on high-volume traffic. Each protected impression requests and decodes an integrity token.

### Apple

```json
{
  "appId": "YOUR_APP_ID",
  "publisherUid": "FIRESTORE_USER_UID",
  "enabled": true,
  "provider": "app-attest",
  "bundleId": "com.example.app",
  "appIdPrefix": "ABCDE12345",
  "environment": "production"
}
```

Use the App ID prefix associated with the bundle ID. It is often the 10-character Team ID, but use the prefix shown in Certificates, Identifiers & Profiles. Set `environment` to `development` for development keys or `production` for production keys.

On first impression, the iOS SDK requests a one-time server challenge, attests a Secure Enclave key, and stores the registered key identifier. Later impressions include an assertion over the signed grant. The backend validates Apple's certificate chain, app identifier, challenge nonce, public key, assertion counter, and current App Attest extension values. It stores the validated launch category and bundle version as risk-audit metadata.

The public challenge and registration endpoints use a shared Firestore rate limit of 60 requests per App ID per minute. Their short-lived documents have TTL fields; deploy the TTL configuration with the backend.

## Rollout

1. Publish Android and iOS SDK 0.5.6 to their registries, including the matching bare Swift Package Manager tag and CocoaPods Trunk release.
2. Deploy the backend with `PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER` and, when trusted geo is available, `TRUSTED_GEO_PROVIDER`.
3. Deploy the Firestore rules and indexes, including TTL for `impressionGrants`, `appAttestChallenges`, `attestationRateLimits`, and `publicAdRateLimits`.
4. Verify protected impressions in a staging App ID on real Android and iOS devices.
5. Create the Admin-only record only after the matching SDK and platform configuration are live.

Set `enabled` to `false` or remove the record to stop native enforcement during a rollback. Attestation raises the cost of automated abuse; it does not itself prove that a person saw an ad.
