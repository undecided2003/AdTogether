<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SDK Security Invariants
Critical: Always adhere to the architectural decisions documented in [SDK_SECURITY_INVARIANTS.md](file:///c:/Users/kevin/Next/AdTogether/docs/SDK_SECURITY_INVARIANTS.md). Specifically, ensure banner components never accidentally fetch or render interstitial ads, as this causes payout fraud.

# Production Deployment Skills (Hacks)
Technical details for Android publishing, Firebase Admin workarounds, and ESM compatibility have been moved to [docs/SKILLS.md](file:///c:/Users/kevin/Next/AdTogether/docs/SKILLS.md) to keep this guide focused on agent-specific behavior.

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
