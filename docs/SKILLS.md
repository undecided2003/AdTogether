# AdTogether Development Skills

This document tracks specialized skills, "hacks", and procedural knowledge required to build, deploy, and maintain the AdTogether ecosystem.

## Maven Central Publishing (Android SDK)

### The Problem
Gradle 9.x and newer versions of the `maven-publish` and `com.vanniktech.maven.publish` plugins introduce strictness that causes common CI/CD patterns to fail:
1. **Task Ambiguity**: Using short names like `publishToStagingLocal` fails because it matches multiple publications (e.g. `debug` and `release`).
2. **PGP Armor Corruption**: Many CI scripts try to "clean" PGP keys by removing headers or newlines. The BouncyCastle decoder used by Gradle 9+ signing plugins requires the **full, raw ASCII armored** key.
3. **Signature Rejection**: Maven Central (Sonatype) will reject uploads if the PGP public key hasn't propagated to their supported keyservers (keyserver.ubuntu.com, pgp.mit.edu).

### The Solution (The "Setup")

#### 1. Explicit Gradle Tasks
Always use the full, unambiguous task names in GitHub Actions or local scripts:
- **Local Staging**: `publishAllPublicationsToStagingLocalRepository`
- **Maven Central**: `publishAllPublicationsToMavenCentralRepository`

#### 2. PGP Key Injection
Do not strip headers or newlines from your `SIGNING_KEY` secret. In GitHub Actions, pass it directly to the environment variable:
```yaml
env:
  ORG_GRADLE_PROJECT_signingInMemoryKey: ${{ secrets.SIGNING_KEY }}
  ORG_GRADLE_PROJECT_signingInMemoryKeyId: ${{ secrets.SIGNING_KEY_ID }}
  ORG_GRADLE_PROJECT_signingInMemoryKeyPassword: ${{ secrets.SIGNING_PASSWORD }}
```

#### 3. Keyserver Propagation Check
Before running the publish task, ensure the public key is available and wait for a buffer period.
```bash
# Verify key presence
gpg --keyserver keyserver.ubuntu.com --recv-keys ${{ secrets.SIGNING_KEY_ID }}
# Mandatory wait for propagation
sleep 120
```

### Reference Implementation
See [.github/workflows/publish.yml](file:///c:/Users/kevin/Next/AdTogether/.github/workflows/publish.yml) for the full pipeline.

---

## Production Deployment Hacks (Next.js & Firebase)

### 1. Firebase Admin Bypass
**Problem:** Next.js bundling often mangles `firebase-admin`.
**Skill:** Use `eval("require('firebase-admin')")` to force a native require.
**Example:** [src/lib/firebase-admin.ts](file:///c:/Users/kevin/Next/AdTogether/src/lib/firebase-admin.ts)

### 2. Server Action Workarounds
**Problem:** Serialization issues on Cloud Functions.
**Skill:** Prefer standard API routes (`/api/...`) over `use server` for complex logic.

### 3. ESM Compatibility
**Problem:** ESM-only libraries crashing in CJS environments.
**Skill:** Use zero-dependency pure Javascript/Regex for parsing (e.g., HTML extraction).
