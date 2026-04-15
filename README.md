<h1 align="center">
  🚀 AdTogether
</h1>

<p align="center">
  <strong>"Show an ad, get an ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-sdks--platforms">SDKs</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-automated-publishing">CI/CD</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 📖 About AdTogether

**AdTogether** is a state-of-the-art ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products and helping you **increase conversions**. Our core philosophy is simple: **"Show an ad, get an ad shown"**.

We provide a seamless, high-performance API and a suite of native SDKs across web, mobile, and cross-platform ecosystems, enabling you to integrate native advertising into any environment.

### 🖼️ Visual Examples

| **Standard Banner Ad** | **Premium Interstitial Ad** |
|:---:|:---:|
| ![Banner Example](./public/ads/Banner_Example.jpg) | ![Interstitial Example](./public/ads/Interstitial_Example.jpg) |
| *Native Banner Example (370x95)* | *Full-Screen Immersive Interstitial Example* |

## ✨ Features

- **Universal Ad Exchange**: Earn credits by showing ads, and spend credits to showcase your own campaigns.
- **Increase Conversions**: Promote your app across the network and drive real installs from engaged users.
- **Multi-Platform SDKs**: First-class support for Web, Android, iOS, and Flutter.
- **High Performance**: Built on a highly scalable Next.js 16 & Firebase backend infrastructure.
- **Developer-First Integration**: Modern hooks, composables, and declarative APIs designed for modern app architectures.
- **Automated Workflows**: Fully configured GitHub Actions CI/CD to handle automated testing and publishing to npm, Maven Central, pub.dev, and SPM.

## 📦 SDKs & Platforms

AdTogether provides native SDKs for the most popular platforms. All code is managed within this monorepo to ensure version parity and unified development.

| Platform | SDK Path | Package Tracker/Manager | Description |
|----------|----------|-------------------------|-------------|
| **🌐 Web** | [`./sdk/web-sdk`](./sdk/web-sdk) | npm: `@adtogether/web-sdk` | Lightweight TypeScript SDK for React and Vanilla JS. Features hooks and native React components. |
| **🤖 Android** | [`./sdk/android-sdk`](./sdk/android-sdk) | Maven: `com.adtogether:sdk` | Native Kotlin SDK with full Jetpack Compose support, offering lifecycle-aware ad loading. |
| **🍎 iOS** | [`./sdk/ios-sdk`](./sdk/ios-sdk) | SPM / CocoaPods | Swift-native iOS SDK requiring iOS 15.0+ with high-performance native ad rendering. |
| **💙 Flutter** | [`./sdk/adtogether_sdk`](./sdk/adtogether_sdk) | pub.dev: `adtogether_sdk` | Cross-platform Dart SDK offering beautiful, performant customizable ad widgets. |

---

## 🛠️ Getting Started

### 1. The Core Platform (Dashboard & Backend API)

The backend and developer dashboard are built using **Next.js 16** and **Firebase**.

#### Prerequisites
- Node.js (v18+)
- npm / yarn / pnpm

#### Installation

```bash
# 1. Clone the repository
git clone https://github.com/undecided2003/AdTogether.git
cd AdTogether

# 2. Install core dependencies
npm install

# 3. Configure environment variables
# Create a .env.local file and add your Firebase credentials
# (See .env.local.example or project documentation for required keys)

# 4. Start the development server
npm run dev
```

Visit [https://adtogether.relaxsoftwareapps.com](https://adtogether.relaxsoftwareapps.com) to view the AdTogether dashboard.

---

### 2. Integrating the SDKs

Detailed instructions are provided in each SDK's local `README.md`. 

- **Web integration:** `npm install @adtogether/web-sdk`
- **Android integration:** Implement `com.adtogether:sdk:0.1.1` inside your `build.gradle.kts`.
- **iOS integration:** Add the Swift Package through Xcode directly from this repository link.
- **Flutter integration:** Run `flutter pub add adtogether_sdk:^0.1.3`.

---

## 🚀 Automated Publishing (CI/CD)

This repository heavily utilizes **GitHub Actions** for automated multi-platform continuous integration and deployment. 

Whenever a new version tag (e.g., `v1.0.0`) is pushed to the `main` branch, the deployment pipeline activates:
1. **Web**: Builds and publishes the TypeScript SDK to the **npm registry**.
2. **Android**: Assembles the AAR, generates JavaDocs, signs with GPG, and deploys to **Maven Central (Sonatype)**.
3. **iOS**: Validates the `Package.swift` configuration for Swift Package Manager integrations.
4. **Flutter**: Validates the codebase using `dart analyze` and builds the package structure for **pub.dev**.

---

## 🤝 Contributing

We welcome contributions from the community! If you're interested in improving the AdTogether ecosystem:

1. **Fork** the repository.
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`.
3. **Commit your changes:** `git commit -m 'Add an amazing feature'`.
4. **Push to the branch:** `git push origin feature/amazing-feature`.
5. **Open a Pull Request**.

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for complete details.

---
<p align="center">
  Built with ❤️ by the AdTogether Team.
</p>
