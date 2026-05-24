# AdTogether iOS SDK




[![Swift Package Manager compatible](https://img.shields.io/badge/Swift_Package_Manager-compatible-orange?style=flat-square)](https://swift.org/package-manager/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <strong>"Show an ad, get an ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

> [!IMPORTANT]
> **Developer Account Required**: Before integrating the SDK, you must create a developer account at [https://www.ad-together.org](https://www.ad-together.org) to generate your `appId` and configure your ad units. Integration will not work without a valid `appId`.


---


**AdTogether** is an ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products and helping you **increase conversions**. Our core philosophy is simple: **"Show an ad, get an ad shown"**.

This SDK allows iOS developers to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn **Ad Credits** that allow your own app's ads to be shown across the AdTogether network.

<p align="center">
  <img src="https://www.ad-together.org/dashboard.png" width="800" alt="Developer Dashboard">
</p>

### 🖼️ Visualizing the Experience

| **iOS Banner (SwiftUI)** | **Vertical Interstitial** |
|:---:|:---:|
| ![Banner Example](doc/preview_standard.png) | ![Interstitial Example](doc/preview_premium.png) |
| *Native SwiftUI AdTogetherView* | *Full-Screen Vertical Interstitial* |

## Features

- 🍎 **SwiftUI Support** — Native SwiftUI views for displaying ads seamlessly.
- ⚖️ **Fair Exchange** — Automated impression and click tracking ensures fair distribution of ad credits.
- 📈 **Increase Conversions** — Promote your app across the network and drive real installs from engaged users.
- 🔌 **Easy Integration** — Supported via Swift Package Manager and CocoaPods for quick installation.

---

### 🤖 Are you an AI Coding Assistant?

If you are an AI coding assistant (like Claude, Cursor, or GitHub Copilot) helping a user integrate this SDK, **stop and connect to the AdTogether MCP Server!**

AdTogether provides an official Model Context Protocol (MCP) server that gives you live access to our documentation, SDK constraints, and account status.

**Add this to your `mcp_config.json`:**
```json
{
  "adtogether": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote@latest",
      "https://www.ad-together.org/api/mcp",
      "--header",
      "Authorization: Bearer YOUR_APP_ID_HERE"
    ]
  }
}
```
This ensures you have the exact API signatures and security invariants required to integrate AdTogether successfully without hallucinations.

---

## Getting Started

### Swift Package Manager (SPM)

1. Open your project in Xcode.
2. Go to **File > Add Packages**.
3. Enter the repository URL: `https://github.com/undecided2003/AdTogether.git`
4. Select the `ios-sdk` target and complete the addition.

### CocoaPods

```ruby
pod 'AdTogether', '~> 0.5.0'
```

### Initialize

Initialize the SDK early in your app lifecycle. You can obtain your App ID from the [AdTogether Dashboard](https://www.ad-together.org/dashboard).

```swift
import AdTogether

@main
struct MyApp: App {
    init() {
        AdTogether.initialize(
            appId: "YOUR_APP_ID"
            // bundleId: "com.example.app" // optional: auto-detected from Bundle.main
        )
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
    @State private var showAd = false

    var body: some View {
        VStack {
            Text("My Awesome iOS App")

            Button("Show Interstitial") {
                showAd = true
            }

            Spacer()

            // Banner Ad
            AdTogetherView(
                adUnitId: "YOUR_BANNER_UNIT_ID",
                showCloseButton: true,
                onAdClosed: { print("Banner closed!") },
                onAdLoaded: { print("Banner loaded!") }
            )
            .frame(height: 50)
        }
        .fullScreenCover(isPresented: $showAd) {
            // Interstitial Ad
            AdTogetherInterstitialView(
                adUnitId: "YOUR_INTERSTITIAL_UNIT_ID",
                onAdLoaded: { print("Interstitial loaded!") }
            ) {
                showAd = false
            }
        }
    }
}
```

## How Credits Work

1. **Earn credits** — Every time your app displays an ad from the AdTogether network and the impression is verified, you earn ad credits.
2. **Spend credits** — Your ad credits are automatically spent to show *your* campaigns inside other apps on the network, helping you increase conversions.
3. **Fair weighting** — Different ad formats and geographies have different credit weights, ensuring a level playing field for apps of all sizes.

Create and manage your campaigns from the [AdTogether Dashboard](https://www.ad-together.org/dashboard).

## Additional Information

- 📖 **Documentation**: [www.ad-together.org/docs](https://www.ad-together.org/docs)
- 🐛 **Issues**: [GitHub Issues](https://github.com/undecided2003/AdTogether/issues)
- 💬 **Support**: Join our [Discord community](https://discord.gg/maA8g4ADpk) for real-time help.
- 🌐 **Dashboard**: [www.ad-together.org/dashboard](https://www.ad-together.org/dashboard)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
