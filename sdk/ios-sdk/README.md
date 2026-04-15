# AdTogether iOS SDK

[![Swift Package Manager compatible](https://img.shields.io/badge/Swift_Package_Manager-compatible-orange?style=flat-square)](https://swift.org/package-manager/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <strong>"Show an ad, get an ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

---

**AdTogether** is an ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products and helping you **increase conversions**. Our core philosophy is simple: **"Show an ad, get an ad shown"**.

This SDK allows iOS developers to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn **Ad Credits** that allow your own app's ads to be shown across the AdTogether network.

### 🖼️ Visualizing the Experience

| **iOS Banner (SwiftUI)** | **Vertical Interstitial** |
|:---:|:---:|
| ![Banner Example](../../public/ads/Banner_Example.jpg) | ![Interstitial Example](../../public/ads/Interstitial_Example.jpg) |
| *Native SwiftUI AdTogetherView* | *Full-Screen Vertical Interstitial* |

## Features

- 🍎 **SwiftUI Support** — Native SwiftUI views for displaying ads seamlessly.
- ⚖️ **Fair Exchange** — Automated impression and click tracking ensures fair distribution of ad credits.
- 📈 **Increase Conversions** — Promote your app across the network and drive real installs from engaged users.
- 🔌 **Easy Integration** — Supported via Swift Package Manager and CocoaPods for quick installation.

## Getting Started

### Swift Package Manager (SPM)

1. Open your project in Xcode.
2. Go to **File > Add Packages**.
3. Enter the repository URL: `https://github.com/undecided2003/AdTogether.git`
4. Select the `ios-sdk` target and complete the addition.

### CocoaPods

```ruby
pod 'AdTogether', '~> 0.1.1'
```

### Initialize

Initialize the SDK early in your app lifecycle. You can obtain your App ID from the [AdTogether Dashboard](https://adtogether.relaxsoftwareapps.com/dashboard).

```swift
import AdTogether

@main
struct MyApp: App {
    init() {
        AdTogether.initialize(appId: "YOUR_APP_ID")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

## Usage

```swift
import SwiftUI
import AdTogether

struct ContentView: View {
    var body: some View {
        VStack {
            Text("My Awesome iOS App")

            Spacer()

            AdTogetherView(adUnitID: "YOUR_AD_UNIT_ID")
                .frame(height: 50)
        }
    }
}
```

## How Credits Work

1. **Earn credits** — Every time your app displays an ad from the AdTogether network and the impression is verified, you earn ad credits.
2. **Spend credits** — Your ad credits are automatically spent to show *your* campaigns inside other apps on the network, helping you increase conversions.
3. **Fair weighting** — Different ad formats and geographies have different credit weights, ensuring a level playing field for apps of all sizes.

Create and manage your campaigns from the [AdTogether Dashboard](https://adtogether.relaxsoftwareapps.com/dashboard).

## Additional Information

- 📖 **Documentation**: [adtogether.relaxsoftwareapps.com/docs](https://adtogether.relaxsoftwareapps.com/docs)
- 🐛 **Issues**: [GitHub Issues](https://github.com/undecided2003/AdTogether/issues)
- 💬 **Support**: Join our [Discord community](https://discord.gg/adtogether) for real-time help.
- 🌐 **Dashboard**: [adtogether.relaxsoftwareapps.com/dashboard](https://adtogether.relaxsoftwareapps.com/dashboard)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
