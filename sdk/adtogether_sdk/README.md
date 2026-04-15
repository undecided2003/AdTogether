# AdTogether SDK

[![Pub Version](https://img.shields.io/pub/v/adtogether_sdk)](https://pub.dev/packages/adtogether_sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Flutter](https://img.shields.io/badge/Platform-Flutter-02569B?logo=flutter)](https://flutter.dev)

<p align="center">
  <strong>"Show an ad, get an ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

---

**AdTogether** is an ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products and helping you **increase conversions**. Our core philosophy is simple: **"Show an ad, get an ad shown"**.

This SDK allows Flutter developers to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn **Ad Credits** that allow your own app's ads to be shown across the AdTogether network.

### 🖼️ Visualizing the Experience

| **Flutter Native Banner** | **Vertical Interstitial** |
|:---:|:---:|
| ![Banner Example](doc/preview_standard.png) | ![Interstitial Example](doc/preview_premium.png) |
| *Adaptive Dart Banner Widget* | *Full-Screen Immersive Interstitial* |

## Features

- 🖼️ **Banner Ads** — Drop-in widgets for standard IAB banner sizes, plus a fluid layout that adapts to its container.
- 📺 **Interstitial Ads** — Full-screen ads with a configurable close-button countdown, perfect for natural transition points.
- ⚖️ **Fair Exchange** — Automated impression and click tracking ensures fair distribution of ad credits.
- 🌙 **Dark Mode Support** — All ad widgets automatically adapt to your app's `ThemeData` brightness.
- 🔌 **Easy Integration** — A single `initialize()` call and one widget is all you need to start earning credits and increase conversions.
- 👥 **Community Focused** — Help other developers grow while getting exposure for your own project.

## Getting Started

### 1. Install

Add the dependency to your `pubspec.yaml`:

```yaml
dependencies:
  adtogether_sdk: ^0.1.6
```

Then run:

```bash
flutter pub get
```

### 2. Initialize

Call `AdTogether.initialize()` **before** `runApp()`. You can obtain your App ID from the [AdTogether Dashboard](https://adtogether.relaxsoftwareapps.com/dashboard).

```dart
import 'package:adtogether_sdk/adtogether_sdk.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AdTogether.initialize(appId: 'YOUR_APP_ID');
  runApp(const MyApp());
}
```

#### Advanced Initialization Options

| Parameter   | Type      | Required | Description |
|-------------|-----------|----------|-------------|
| `appId`     | `String`  | ✅       | Your registered App ID from the AdTogether Dashboard. |
| `baseUrl`   | `String?` | ❌       | Override the API base URL (useful for staging/testing environments). |
| `bundleId`  | `String?` | ❌       | Explicitly set your app's bundle/package identifier. If omitted, web traffic is identified by the `Origin` header automatically. For mobile, it is recommended to set this explicitly. |

```dart
AdTogether.initialize(
  appId: 'YOUR_APP_ID',
  baseUrl: 'https://staging.adtogether.example.com', // optional
  bundleId: 'com.example.myapp',                     // recommended for mobile
);
```

## Usage

### Banner Ads

Use the `AdTogetherBanner` widget anywhere in your widget tree. It fetches an ad, renders it, and automatically tracks impressions when 50% or more of the widget is visible.

```dart
import 'package:adtogether_sdk/adtogether_sdk.dart';

@override
Widget build(BuildContext context) {
  return Column(
    children: [
      // ... your content ...

      AdTogetherBanner(
        adUnitId: 'home_bottom_banner',
        size: AdSize.banner,
        onAdLoaded: () => debugPrint('Banner loaded!'),
        onAdFailedToLoad: (error) => debugPrint('Banner error: $error'),
      ),
    ],
  );
}
```

#### `AdTogetherBanner` Parameters

| Parameter          | Type                | Default      | Description |
|--------------------|---------------------|--------------|-------------|
| `adUnitId`         | `String`            | **required** | Unique identifier for this ad placement. |
| `size`             | `AdSize`            | `AdSize.fluid` | The desired ad size. See [Supported Ad Sizes](#supported-ad-sizes). |
| `onAdLoaded`       | `VoidCallback?`     | `null`       | Called when the ad has been successfully fetched and rendered. |
| `onAdFailedToLoad` | `Function(String)?` | `null`       | Called with an error message if the ad fails to load. |

#### Layout Behavior

- **Compact sizes** (`banner`, `largeBanner`, `fullBanner`, `leaderboard`) render as a **horizontal** layout — thumbnail on the left, title and description on the right.
- **Tall sizes** (`mediumRectangle`) and the **`fluid`** size render as a **vertical** layout — a 16:9 image on top with title and description below.
- The `fluid` size expands to fill its parent's width and sizes its height to content automatically.

### Interstitial Ads

Show a full-screen interstitial ad as a modal dialog. A countdown timer is displayed before the user is allowed to close the ad.

```dart
import 'package:adtogether_sdk/adtogether_sdk.dart';

void _showAdBreak() {
  AdTogetherInterstitial.show(
    context: context,
    adUnitId: 'level_complete_interstitial',
    closeDelay: const Duration(seconds: 5),
    onAdLoaded: () => debugPrint('Interstitial ready'),
    onAdFailedToLoad: (error) => debugPrint('Interstitial error: $error'),
    onAdClosed: () {
      // User dismissed the ad — proceed with your app flow
      _navigateToNextLevel();
    },
  );
}
```

#### `AdTogetherInterstitial.show()` Parameters

| Parameter          | Type                | Default                      | Description |
|--------------------|---------------------|------------------------------|-------------|
| `context`          | `BuildContext`      | **required**                 | The build context to display the dialog in. |
| `adUnitId`         | `String`            | **required**                 | Unique identifier for this ad placement. |
| `closeDelay`       | `Duration`          | `Duration(seconds: 3)`       | How long before the close button appears. During this time, a countdown is shown. |
| `onAdLoaded`       | `VoidCallback?`     | `null`                       | Called when the ad has been successfully fetched. |
| `onAdFailedToLoad` | `Function(String)?` | `null`                       | Called with an error message if the ad fails to load. The dialog is automatically dismissed on failure. |
| `onAdClosed`       | `VoidCallback?`     | `null`                       | Called after the user closes the interstitial. |

## Supported Ad Sizes

| Constant                 | Dimensions | Best For |
|--------------------------|------------|----------|
| `AdSize.banner`          | 320 × 50   | Standard phone banner, anchored top or bottom. |
| `AdSize.largeBanner`     | 320 × 100  | Taller phone banner for extra visibility. |
| `AdSize.mediumRectangle` | 300 × 250  | Inline content ads within scrollable lists. |
| `AdSize.fullBanner`      | 468 × 60   | Tablet-width banner. |
| `AdSize.leaderboard`     | 728 × 90   | Tablet/desktop leaderboard. |
| `AdSize.fluid`           | Responsive | Expands to fit its container width; height determined by content. |

You can also create a custom size:

```dart
const myCustomSize = AdSize(width: 400, height: 120);
```

## Data Model

When working with the lower-level `AdTogether.fetchAd()` API, you receive an `AdModel`:

```dart
final ad = await AdTogether.fetchAd('my_unit_id', adType: 'banner');

print(ad.id);          // Unique ad ID
print(ad.title);       // Ad headline
print(ad.description); // Ad body text
print(ad.imageUrl);    // Creative image URL (nullable)
print(ad.clickUrl);    // Destination URL (nullable)
print(ad.token);       // HMAC token for verified impression tracking (nullable)
print(ad.adType);      // 'banner' or 'interstitial' (nullable)
```

### Manual Impression & Click Tracking

If you build a custom ad UI instead of using the built-in widgets, you **must** track impressions and clicks manually:

```dart
// When the ad becomes visible to the user
await AdTogether.trackImpression(ad.id, token: ad.token);

// When the user taps the ad
await AdTogether.trackClick(ad.id, token: ad.token);
```

> **Note:** The built-in `AdTogetherBanner` and `AdTogetherInterstitial` widgets handle impression and click tracking automatically — you only need manual tracking for fully custom ad UIs.

## How Credits Work

1. **Earn credits** — Every time your app displays an ad from the AdTogether network and the impression is verified, you earn ad credits.
2. **Spend credits** — Your ad credits are automatically spent to show *your* campaigns inside other apps on the network, helping you increase conversions.
3. **Fair weighting** — Different ad formats and geographies have different credit weights, ensuring a level playing field for apps of all sizes.

Create and manage your campaigns from the [AdTogether Dashboard](https://adtogether.relaxsoftwareapps.com/dashboard).

## Platform Support

| Platform | Status |
|----------|--------|
| Android  | ✅ Fully supported |
| iOS      | ✅ Fully supported |
| Web      | ✅ Fully supported |
| macOS    | ✅ Supported |
| Windows  | ✅ Supported |
| Linux    | ✅ Supported |

## Dependencies

This SDK depends on the following packages:

| Package               | Purpose |
|-----------------------|---------|
| [`http`](https://pub.dev/packages/http) | HTTP requests for ad fetching and event tracking. |
| [`url_launcher`](https://pub.dev/packages/url_launcher) | Opening ad click-through URLs in the device browser. |
| [`visibility_detector`](https://pub.dev/packages/visibility_detector) | Viewability-based impression tracking for banner ads. |

## Additional Information

- 📖 **Documentation**: [adtogether.relaxsoftwareapps.com/docs](https://adtogether.relaxsoftwareapps.com/docs)
- 🐛 **Issues**: [GitHub Issues](https://github.com/undecided2003/AdTogether/issues)
- 💬 **Support**: Join our [Discord community](https://discord.gg/maA8g4ADpk) for real-time help.
- 🌐 **Dashboard**: [adtogether.relaxsoftwareapps.com/dashboard](https://adtogether.relaxsoftwareapps.com/dashboard)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
