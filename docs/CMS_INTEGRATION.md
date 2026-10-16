# CMS & Website Builder Integration Guide

This guide provides step-by-step instructions on embedding AdTogether ad units into popular no-code and Content Management System (CMS) platforms using a lightweight HTML snippet. No package manager or command-line build tools required.

---

## ⚡ The Universal Embed Snippet

Every CMS integration utilizes a two-part HTML snippet:

```html
<!-- 1. Load the AdTogether SDK (add once, ideally in <head> or at the top of your page) -->
<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>

<!-- 2. Ad Banner Container (place wherever you want the ad unit to display) -->
<div
  data-ad-unit="YOUR_AD_UNIT_ID"
  style="width: 100%; min-height: 50px;"
></div>
```

> **Configuration**: Replace `YOUR_APP_ID` and `YOUR_AD_UNIT_ID` with values from the [Dashboard](https://www.ad-together.org/dashboard). Put the App ID on the script tag once per site, or add `data-app-id` to an individual container.

---

## 📑 Platform-Specific Instructions

### 1. WordPress

#### Method A: Gutenberg Block Editor (Per Page or Post)
1. Open the post or page editor in your WordPress admin.
2. Click the **+** (Add Block) button and search for **Custom HTML**.
3. Insert the **Custom HTML** block into your layout where you want the ad displayed.
4. Paste the snippet (both the `<script>` tag and `<div>` container).
5. Click **Preview in new tab** to verify the ad renders.

#### Method B: Site-Wide Integration (WPCode / Header Injection)
1. Install and activate the free [WPCode](https://wordpress.org/plugins/insert-headers-and-footers/) plugin (or any Header & Footer injection plugin).
2. Navigate to **Code Snippets → Header & Footer**.
3. Paste the `<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>` tag into the **Header** textarea and click **Save Changes**.
4. In any page, template, widget, or post, simply insert the container:
   ```html
   <div data-ad-unit="YOUR_AD_UNIT_ID" style="width: 100%; min-height: 50px;"></div>
   ```

#### Method C: Classic Editor & Page Builders (Elementor / Divi)
- **Classic Editor:** Switch from the **Visual** tab to the **Text** (HTML) tab and paste the snippet directly.
- **Elementor / Divi / Beaver Builder:** Add an **HTML Widget / Code Module** and paste the snippet inside.

---

### 2. Wix

#### Method A: On-Page Embed (Banner Ads)
1. Open your site in the **Wix Editor**.
2. In the left panel, click **+** (Add Elements) → **Embed Code** → **Embed HTML**.
3. In the settings panel, select **Code** mode.
4. Paste the complete snippet:
   ```html
   <script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>
   <div data-ad-unit="YOUR_AD_UNIT_ID" style="width: 100%; min-height: 50px;"></div>
   ```
5. Click **Update** and resize/position the iframe container to fit your design (e.g. 320×50 or 728×90).

#### Method B: Site-Wide & Full-Screen Interstitials (Wix Premium)
1. In your Wix Dashboard, navigate to **Settings → Custom Code**.
2. Click **+ Add Custom Code**.
3. Paste `<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>`.
4. Choose **Head** placement and apply to **All Pages**.
5. Place individual ad `<div>` containers on specific pages using Embed HTML blocks.

> ⚠️ **Wix Sandbox Note**: Wix renders on-page HTML blocks inside sandboxed `<iframe>` elements. For interstitial overlays, use **Settings → Custom Code** on a Premium Wix site.

---

### 3. Weebly

#### Method A: Embed Code Element
1. Open the Weebly site builder.
2. In the left sidebar under **Basic**, drag the **Embed Code** (`</>`) element onto your page.
3. Click inside the custom element box on your page and select **Edit Custom HTML**.
4. Paste your AdTogether snippet.
5. Click anywhere outside the box to save.
6. Click **Publish** at the top right.

#### Method B: Site-Wide Header Code
1. Navigate to **Settings → SEO**.
2. Scroll to the **Header Code** section.
3. Paste `<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>`.
4. Click **Save** and **Publish**.
5. Add `<div data-ad-unit="YOUR_AD_UNIT_ID" style="width: 100%; min-height: 50px;"></div>` into any on-page Embed Code elements.

> ⚠️ **Publish Required**: Weebly blocks JavaScript execution inside the editor mode. You must publish and view the live website to verify ad delivery.

---

### 4. Squarespace

#### Method A: Code Block (Page Sections)
1. Edit the Squarespace page where you want the ad.
2. Hover over a section insertion point and click **+ Add Block** → choose **Code**.
3. In the code block configuration window:
   - Select **HTML** from the dropdown.
   - Ensure **Display Source** is **unchecked / disabled**.
4. Paste the complete AdTogether snippet.
5. Click **Save** (or **Exit → Save**).

#### Method B: Site-Wide Code Injection (Squarespace Business / Commerce)
1. Go to **Settings → Developer Tools → Code Injection** (or **Website → Pages → Website Tools → Code Injection**).
2. Paste the `<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>` into the **Header** field.
3. Place `<div data-ad-unit="YOUR_AD_UNIT_ID" style="width: 100%; min-height: 50px;"></div>` inside Code Blocks across any pages.

> ⚠️ **Admin Preview Disabled**: Squarespace prevents custom JavaScript execution when you are logged into the editor. Always preview using an **Incognito / Private Window** or log out to test.

---

### 5. Webflow

#### Method A: Embed Component
1. Open the Webflow Designer for your project.
2. Press `A` or click the **+** (Add Elements) button in the left panel.
3. Scroll down to the **Advanced** section and drag an **Embed** component to your canvas.
4. In the HTML Embed Code Editor modal, paste the snippet:
   ```html
   <script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>
   <div data-ad-unit="YOUR_AD_UNIT_ID" style="width: 100%; min-height: 50px;"></div>
   ```
5. Click **Save & Close**.

#### Method B: Project Settings Custom Code (Recommended Site-Wide)
1. Go to **Project Settings → Custom Code**.
2. In the **Head Code** textarea, paste:
   ```html
   <script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>
   ```
3. Save changes and publish your site.
4. In the designer, you only need the container div in your Embed components:
   ```html
   <div data-ad-unit="YOUR_AD_UNIT_ID" style="width: 100%; min-height: 50px;"></div>
   ```

> ⚠️ **Designer Preview**: Custom scripts do not run inside the Webflow Designer. Click **Publish** to your `*.webflow.io` staging domain to test your ad unit.

---

## 🔍 Platform Comparison & Features

| CMS / Builder | Primary Embed Method | Site-Wide Script Injection | Editor Preview Behavior |
|---|---|---|---|
| **WordPress** | Custom HTML Block / Elementor | WPCode / Theme Header | Live preview in new tab |
| **Wix** | Embed Code → Embed HTML | Settings → Custom Code (Premium) | Sandboxed iframe |
| **Weebly** | Embed Code (`</>`) Element | Settings → SEO → Header Code | Blocked until site published |
| **Squarespace** | Code Block (HTML Mode) | Code Injection → Header | Disabled in admin mode |
| **Webflow** | Embed Component (`+` Add) | Project Settings → Head Code | Disabled in Designer (test on staging) |

---

## 🛠️ Troubleshooting & FAQ

| Issue | Root Cause | Solution |
|---|---|---|
| **No ad showing in editor** | Builders disable scripts to protect editor UI | Publish site or check live URL in an incognito window. |
| **Blank space / 0 impressions** | Invalid Ad Unit ID or App ID | Confirm your Ad Unit ID matches the ID in your Developer Dashboard. |
| **No credits available** | Reciprocal credit balance is 0 | Visit the dashboard to top up credits or serve impressions on other units. |
| **Layout shifted / collapsed** | Missing container height | Add `min-height: 50px;` and `width: 100%;` style attributes to the container `<div>`. |
