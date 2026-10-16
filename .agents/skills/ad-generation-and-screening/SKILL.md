---
name: ad-generation-and-screening
description: Architecture, data flow, and client/server coordination patterns for AI ad generation and safety screening in AdTogether.
---

# Ad Generation and Screening Patterns

Details on the auto-generation and content safety screening flows in AdTogether.

## 1. Auto-write Ad Feature (AI Generation)
- **Path:** `/api/generate` -> calls `generateAdContent`
- **Method:** Scrapes the target URL using `fetch` (with mobile user-agent), extracts text/images via regex, and passes context to DeepSeek.
- **Image Coordination (Client):** 
  - The API returns images as `imageBase64` + `imageMimeType`.
  - **Crucial Pattern:** The client converts this to a `File` object before uploading:
    ```typescript
    const dataUrl = `data:${mime};base64,${base64}`;
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'image.jpg', { type: mime });
    ```
  - This bypasses CORS and mixed-content issues for the preview before the final upload to Firebase Storage.

## 2. Ad Content Screening (Safety)
- **Path:** `/api/screen` -> calls `screenAdContent`
- **Logic:** Uses DeepSeek to verify compliance with [AD_CONTENT_POLICY.md](file:///c:/Users/kevin/Next/AdTogether/AD_CONTENT_POLICY.md) before allowing the campaign to launch.
- **Trigger:** Called during `handleSubmit` before uploading the image to Storage.
