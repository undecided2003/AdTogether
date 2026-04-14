# AdTogether iOS SDK

[![Swift Package Manager compatible](https://img.shields.io/badge/Swift_Package_Manager-compatible-orange?style=flat-square)](https://swift.org/package-manager/)

<p align="center">
  <strong>"Shown an ad, get ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

**AdTogether** is a state-of-the-art ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products. Our core philosophy is simple: **"Shown an ad, get ad shown"**.

This SDK allows iOS developers to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn "Ad Credits" that allow your own app's ads to be shown across the AdTogether network.

## Features

- **SwiftUI Support**: Native SwiftUI views for displaying ads seamlessly.
- **Fair Exchange**: Automated tracking of impressions to ensure fair distribution of ad credits.
- **Easy Integration**: Supported via Swift Package Manager and CocoaPods for quick installation.

## Getting started

### Swift Package Manager (SPM)

1. Open your project in Xcode.
2. Go to **File > Add Packages**.
3. Enter the repository URL: `https://github.com/undecided2003/AdTogether.git`
4. Select the `ios-sdk` target and complete the addition.

## Usage

```swift
import SwiftUI
import AdTogether

struct ContentView: View {
    var body: some View {
        VStack {
            Text("My Awesome iOS App")
            
            Spacer()
            
            AdTogetherBanner(appId: "YOUR_APP_ID")
                .frame(height: 50)
        }
    }
}
```

## Additional information

- **Documentation**: For full documentation, visit [adtogether.relaxsoftwareapps.com/docs](https://adtogether.relaxsoftwareapps.com/docs).
- **Issues**: Found a bug? File an issue on our [GitHub repository](https://github.com/undecided2003/AdTogether/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
