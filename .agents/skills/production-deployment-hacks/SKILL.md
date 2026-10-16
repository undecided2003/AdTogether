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
