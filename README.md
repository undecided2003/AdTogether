# 🚀 AdTogether

**AdTogether** is a universal ad exchange and monetization platform designed to provide developers with a seamless, high-performance way to integrate advertising into any application—on the web, mobile, or via cross-platform frameworks.

---

## 📦 SDKs & Platforms

AdTogether provides native SDKs for the most popular platforms, all managed within this monorepo.

### 🌐 [Web SDK](./sdk/web-sdk)
Modern, lightweight TypeScript SDK for React and Vanilla JS.
- **npm**: `@adtogether/web-sdk`
- **Features**: Native ads, Banners, and Hooks for React.

### 🤖 [Android SDK](./sdk/android-sdk)
Native Android SDK written in Kotlin with Jetpack Compose support.
- **Maven**: `com.adtogether:sdk`
- **Features**: Seamless UI integration, Lifecycle-aware ad loading.

### 🍎 [iOS SDK](./sdk/ios-sdk)
Swift-native SDK with Swift Package Manager (SPM) support.
- **Platform**: iOS 15.0+
- **Features**: High-performance rendering, CocoaPods & SPM support.

### 💙 [Flutter SDK](./sdk/adtogether_sdk)
Cross-platform SDK for beautiful, performant ad integration in Flutter.
- **Pub**: `adtogether_sdk`
- **Features**: Widget-based integration, Universal platform support.

---

## 🛠️ Getting Started with the Platform

The core AdTogether platform is built with **Next.js 15** and **Firebase**.

### Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up your environment variables (`.env.local`).
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 🚀 Automated Publishing

This repository is configured with **GitHub Actions** for automated multi-platform releases.
When you push a Git tag (e.g. `v1.0.0`), the system automatically:
- Publishes the Web SDK to **npm**.
- Signs and publishes the Android SDK to **Maven Central**.
- Validates the iOS Swift Package.
- Prepares the Flutter package for **pub.dev**.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

---

Built with ❤️ by the AdTogether Team.
