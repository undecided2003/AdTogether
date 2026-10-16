---
name: maven-central-publishing
description: Guidelines, procedures, and troubleshooting for publishing the Android SDK to Maven Central (Sonatype) with Gradle 9+ and PGP signing.
---

# Maven Central Publishing (Android SDK)

Procedural knowledge and requirements for publishing the AdTogether Android SDK to Maven Central (Sonatype) via Gradle.

## The Problem
Gradle 9.x and newer versions of the `maven-publish` and `com.vanniktech.maven.publish` plugins introduce strictness that causes common CI/CD patterns to fail:
1. **Task Ambiguity**: Using short names like `publishToStagingLocal` fails because it matches multiple publications (e.g., `debug` and `release`).
2. **PGP Armor Corruption**: Many CI scripts try to "clean" PGP keys by removing headers or newlines. The BouncyCastle decoder used by Gradle 9+ signing plugins requires the **full, raw ASCII armored** key.
3. **Signature Rejection**: Maven Central (Sonatype) will reject uploads if the PGP public key hasn't propagated to their supported keyservers (`hkps://keyserver.ubuntu.com`, `hkps://keys.openpgp.org`).

## The Solution (The Setup)

### 1. Explicit Gradle Tasks
Always use the full, unambiguous task names in GitHub Actions or local scripts:
- **Local Staging**: `publishAllPublicationsToStagingLocalRepository`
- **Maven Central**: `publishAllPublicationsToMavenCentralRepository`

### 2. PGP Key Injection
Do not strip headers or newlines from your `SIGNING_KEY` secret. In GitHub Actions, pass it directly to the environment variable:
```yaml
env:
  ORG_GRADLE_PROJECT_signingInMemoryKey: ${{ secrets.SIGNING_KEY }}
  ORG_GRADLE_PROJECT_signingInMemoryKeyId: ${{ secrets.SIGNING_KEY_ID }}
  ORG_GRADLE_PROJECT_signingInMemoryKeyPassword: ${{ secrets.SIGNING_PASSWORD }}
```

### 3. Keyserver Propagation Check
Before running the publish task, ensure the public key is available and wait for a buffer period.
```bash
# Verify key presence
gpg --keyserver hkps://keyserver.ubuntu.com --recv-keys ${{ secrets.SIGNING_KEY_ID }}
# Mandatory wait for propagation
sleep 120
```

## Reference Implementation
See [.github/workflows/publish.yml](file:///c:/Users/kevin/Next/AdTogether/.github/workflows/publish.yml) for the full CI pipeline.
