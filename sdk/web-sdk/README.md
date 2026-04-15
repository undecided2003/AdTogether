# AdTogether Web SDK

[![npm version](https://img.shields.io/npm/v/@adtogether/web-sdk)](https://www.npmjs.com/package/@adtogether/web-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <strong>"Show an ad, get an ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

---

**AdTogether** is an ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products and helping you **increase conversions**. Our core philosophy is simple: **"Show an ad, get an ad shown"**.

This SDK allows web developers (React and Vanilla JS) to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn **Ad Credits** that allow your own app's ads to be shown across the AdTogether network.

### 🖼️ Visualizing the Experience

| **Native Banner Ad** | **Interstitial Full-Screen** |
|:---:|:---:|
| ![Banner Example](doc/preview_standard.png) | ![Interstitial Example](doc/preview_premium.png) |
| *Adaptive React Banner Component* | *Full-Screen Interstitial Experience* |

## Features

- 🖼️ **Banner Ads** — Native React `AdTogetherBanner` component with automatic impression tracking and dark mode support.
- 📺 **Interstitial Ads** — Full-screen `AdTogetherInterstitial` component with a configurable close-button countdown.
- 🌑 **Dark Mode Support** — All ad components automatically adapt to system preference, or can be set to `'dark'` / `'light'` explicitly.
- ⚖️ **Fair Exchange** — Automated impression and click tracking ensures fair distribution of ad credits.
- 🔌 **Easy Integration** — A single `initialize()` call and one component is all you need to start earning credits and increase conversions.
- 🧩 **Vanilla JS Support** — Core logic decoupled for use without React or any framework.

## Getting Started

### 1. Install

```bash
npm install @adtogether/web-sdk
```

### 2. Initialize

Call `AdTogether.initialize()` before rendering any ad components. You can obtain your App ID from the [AdTogether Dashboard](https://adtogether.relaxsoftwareapps.com/dashboard).

```typescript
import { AdTogether } from '@adtogether/web-sdk';

AdTogether.initialize({ appId: 'YOUR_APP_ID' });
```

## Usage

### Banner Ads

Use the `AdTogetherBanner` component anywhere in your React tree. It fetches an ad, renders it, and automatically tracks impressions when 50% or more of the component is visible.

```jsx
import { AdTogetherBanner } from '@adtogether/web-sdk/react';

function MyApp() {
  return (
    <div>
      <h1>My Awesome Web App</h1>

      <AdTogetherBanner
        adUnitId="home_bottom_banner"
        onAdLoaded={() => console.log('Banner loaded!')}
        onAdFailedToLoad={(error) => console.error('Banner error:', error)}
      />
    </div>
  );
}
```

#### `AdTogetherBanner` Props

| Prop               | Type                    | Default   | Description |
|--------------------|-------------------------|-----------|-------------|
| `adUnitId`         | `string`                | **required** | Unique identifier for this ad placement. |
| `width`            | `number \| string`      | `'100%'`  | Width of the ad element. |
| `height`           | `number \| string`      | `'auto'`  | Height of the ad element. |
| `theme`            | `'dark' \| 'light' \| 'auto'` | `'auto'` | Color scheme. `'auto'` follows system preference. |
| `onAdLoaded`       | `() => void`            | —         | Called when the ad has been successfully fetched and rendered. |
| `onAdFailedToLoad` | `(error: Error) => void`| —         | Called if the ad fails to load. |
| `className`        | `string`                | `''`      | Additional CSS class name for the container. |
| `style`            | `React.CSSProperties`   | `{}`      | Additional inline styles for the container. |

### Interstitial Ads

Show a full-screen interstitial ad as a portal overlay. A countdown timer is displayed before the user is allowed to close the ad.

```jsx
import { useState } from 'react';
import { AdTogetherInterstitial } from '@adtogether/web-sdk/react';

function MyApp() {
  const [showInterstitial, setShowInterstitial] = useState(false);

  return (
    <div>
      <button onClick={() => setShowInterstitial(true)}>
        Show Interstitial Ad
      </button>

      <AdTogetherInterstitial
        adUnitId="level_complete_interstitial"
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
        closeDelay={5}
        onAdLoaded={() => console.log('Interstitial ready')}
        onAdFailedToLoad={(error) => console.error('Interstitial error:', error)}
      />
    </div>
  );
}
```

#### `AdTogetherInterstitial` Props

| Prop               | Type                    | Default   | Description |
|--------------------|-------------------------|-----------|-------------|
| `adUnitId`         | `string`                | **required** | Unique identifier for this ad placement. |
| `isOpen`           | `boolean`               | **required** | When `true`, the interstitial is displayed. |
| `onClose`          | `() => void`            | **required** | Called when the user closes the interstitial. |
| `closeDelay`       | `number`                | `3`       | Seconds before the close button appears. A countdown is shown during this time. |
| `theme`            | `'dark' \| 'light' \| 'auto'` | `'auto'` | Color scheme. `'auto'` follows system preference. |
| `onAdLoaded`       | `() => void`            | —         | Called when the ad has been successfully fetched. |
| `onAdFailedToLoad` | `(error: Error) => void`| —         | Called if the ad fails to load. The dialog is automatically dismissed on failure. |

## How Credits Work

1. **Earn credits** — Every time your app displays an ad from the AdTogether network and the impression is verified, you earn ad credits.
2. **Spend credits** — Your ad credits are automatically spent to show *your* campaigns inside other apps on the network, helping you increase conversions.
3. **Fair weighting** — Different ad formats and geographies have different credit weights, ensuring a level playing field for apps of all sizes.

Create and manage your campaigns from the [AdTogether Dashboard](https://adtogether.relaxsoftwareapps.com/dashboard).

## Additional Information

- 📖 **Documentation**: [adtogether.relaxsoftwareapps.com/docs](https://adtogether.relaxsoftwareapps.com/docs)
- 🐛 **Issues**: [GitHub Issues](https://github.com/undecided2003/AdTogether/issues)
- 💬 **Support**: Join our [Discord community](https://discord.gg/maA8g4ADpk) for real-time help.
- 🌐 **Dashboard**: [adtogether.relaxsoftwareapps.com/dashboard](https://adtogether.relaxsoftwareapps.com/dashboard)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
