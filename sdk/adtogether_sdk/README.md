# AdTogether SDK

[![Pub Version](https://img.shields.io/pub/v/adtogether_sdk)](https://pub.dev/packages/adtogether_sdk)

<p align="center">
  <strong>"Shown an ad, get ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

**AdTogether** is a state-of-the-art ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products. Our core philosophy is simple: **"Shown an ad, get ad shown"**.

This SDK allows Flutter developers to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn "Ad Credits" that allow your own app's ads to be shown across the AdTogether network.

## Features

- **Banner Ads**: Easy-to-use widgets for displaying standard-sized banners.
- **Fair Exchange**: Automated tracking of impressions to ensure fair distribution of ad credits.
- **Easy Integration**: Minimal setup required to start showing ads.
- **Community Focused**: Help other developers while getting exposure for your own project.

## Getting started

In your `pubspec.yaml` file, add the dependency:

```yaml
dependencies:
  adtogether_sdk: ^0.1.1
```

Run `flutter pub get` to install the package.

### Configuration

Initialize the SDK with your App ID (obtained from the [AdTogether Dashboard](https://adtogether.relaxsoftwareapps.com/dashboard)):

```dart
import 'package:adtogether_sdk/adtogether_sdk.dart';

void main() {
  AdTogether.initialize(appId: 'YOUR_APP_ID');
  runApp(MyApp());
}
```

## Usage

### Displaying a Banner Ad

Simply use the `AdTogetherBanner` widget anywhere in your widget tree:

```dart
import 'package:adtogether_sdk/adtogether_sdk.dart';

// ... inside your build method
AdTogetherBanner(
  adSize: AdSize.banner, // Standard 320x50 banner
)
```

## Supported Ad Sizes

- `AdSize.banner` (320x50)
- `AdSize.largeBanner` (320x100)
- `AdSize.mediumRectangle` (300x250)

## Additional information

- **Documentation**: For full documentation, visit [adtogether.relaxsoftwareapps.com/docs](https://adtogether.relaxsoftwareapps.com/docs).
- **Issues**: Found a bug? File an issue on our [GitHub repository](https://github.com/AdTogether/AdTogether/issues).
- **Support**: Join our Discord community for real-time support and discussion.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
