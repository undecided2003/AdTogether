<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SDK Security Invariants
Critical: Always adhere to the architectural decisions documented in [SDK_SECURITY_INVARIANTS.md](file:///c:/Users/kevin/Next/AdTogether/docs/SDK_SECURITY_INVARIANTS.md). Specifically, ensure banner components never accidentally fetch or render interstitial ads, as this causes payout fraud.

# Production Deployment Skills (Hacks)

## 1. Firebase Admin Bypass
**Problem:** Next.js build process often fails to bundle `firebase-admin` correctly or mangles it in a way that Cloud Functions cannot resolve.
**Skill:** Use `eval("require('firebase-admin')")` in server-side libraries to force a native CommonJS require that bypasses the Next.js static analysis/bundling for that module.
**Example:** [firebase-admin.ts](file:///c:/Users/kevin/Next/AdTogether/src/lib/firebase-admin.ts)

## 2. Server Action Workarounds
**Problem:** Next.js 16 Server Actions (`use server`) can have serialization issues or runtime failures on Firebase Hosting/Cloud Functions.
**Skill:** Prefer standard API routes (`/api/...`) and client-side `fetch()` for complex logic like AI generation or content screening.
**Example:** [CreateAdPage](file:///c:/Users/kevin/Next/AdTogether/src/app/create-ad/page.tsx) uses `fetch('/api/generate')` instead of the `generateAdContent` server action directly.

## 3. ESM Compatibility vs Cloud Functions
**Problem:** ESM-only libraries (like `cheerio` v1.2.0+) may crash in the Cloud Functions runtime environments that still expect CJS or have mixed module baggage.
**Skill:** Use zero-dependency pure Javascript/Regex implementations for core tasks like HTML parsing to avoid external dependency hell.
**Example:** [actions.ts](file:///c:/Users/kevin/Next/AdTogether/src/app/create-ad/actions.ts) uses regex-based extraction.

# Internal implementation Patterns

## Auto-write Ad Feature (AI Generation)
- **Path:** `/api/generate` -> calls `generateAdContent`
- **Method:** Scrapes the target URL using `fetch` (with mobile user-agent), extracts text/images via regex, and passes context to DeepSeek.
- **Image Coordination (Client):** 
    - The API returns images as `imageBase64` + `imageMimeType`.
    - **Crucial Pattern:** The client converts this to a `File` object using:
      ```typescript
      const dataUrl = `data:${mime};base64,${base64}`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'image.jpg', { type: mime });
      ```
    - This bypasses CORS and mixed-content issues for the preview before the final upload to Firebase Storage.

## Ad Content Screening (Safety)
- **Path:** `/api/screen` -> calls `screenAdContent`
- **Logic:** Uses DeepSeek to verify compliance with [AD_CONTENT_POLICY.md](file:///c:/Users/kevin/Next/AdTogether/AD_CONTENT_POLICY.md) before allowing the campaign to launch.
- **Trigger:** Called during `handleSubmit` before uploading the image to Storage.

# Live SDK Usage patterns

## Example Integration
For a full-featured example of the `@adtogether/web-sdk` in a Next.js client component, see [ExampleAdsButton.tsx](file:///c:/Users/kevin/Next/AdTogether/src/components/ExampleAdsButton.tsx).

**Key Learnings:**
1.  **Initialization:** Always `AdTogether.initialize({ appId, bundleId })` in a `useEffect` on the client.
2.  **Banner Props:** Use `showCloseButton={true}` and `onAdClosed` to handle user dismissals.
3.  **Interstitial Logic:** Control visibility via `isOpen` and `onClose` props.
4.  **Ad Units:** Use descriptive unit IDs like `example_banner` or `example_interstitial`.
