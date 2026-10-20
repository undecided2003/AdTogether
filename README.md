<h1 align="center">
  🚀 AdTogether
</h1>




<p align="center">
  <strong>"Show an ad, get an ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

> [!IMPORTANT]
> **Developer Account Required**: Before integrating any SDKs, you must create a developer account at [https://www.ad-together.org](https://www.ad-together.org). Once registered, you can create your first campaign, generate an `appId`, and configure ad units. Integration will not work without a valid `appId`.


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

<p align="center">
  <img src="https://www.ad-together.org/dashboard.webp" width="800" alt="Developer Dashboard">
</p>

### 🖼️ Visual Examples

| **Standard Banner Ad** | **Premium Interstitial Ad** |
|:---:|:---:|
| ![Banner Example](doc/preview_standard.png) | ![Interstitial Example](doc/preview_premium.png) |
| *Native Banner Example (370x95)* | *Full-Screen Immersive Interstitial Example* |

## ✨ Features

- **Universal Ad Exchange**: Earn credits by showing ads, and spend credits to showcase your own campaigns.
- **Increase Conversions**: Promote your app across the network and drive real installs from engaged users.
- **Multi-Platform SDKs**: First-class support for Web, React Native, Android, iOS, and Flutter.
- **CMS & Website Builders**: Drop-in universal HTML snippets for WordPress, Wix, Squarespace, Weebly, and Webflow.
- **High Performance**: Built on a highly scalable Next.js 16 & Firebase backend infrastructure.
- **Developer-First Integration**: Modern hooks, composables, and declarative APIs designed for modern app architectures.
- **Automated Workflows**: Fully configured GitHub Actions CI/CD to handle automated testing and publishing to npm, Maven Central, pub.dev, and SPM.

## 📦 SDKs & Platforms

AdTogether provides native SDKs for the most popular platforms. All code is managed within this monorepo to ensure version parity and unified development.

| Platform | SDK Path | Package Tracker/Manager | Description |
|----------|----------|-------------------------|-------------|
| **🌐 Web** | [`./sdk/web-sdk`](./sdk/web-sdk) | npm: `@adtogether/web-sdk` | Lightweight TypeScript SDK for React and Vanilla JS. Features hooks and native React components. |
| **⚛️ React Native** | [`./sdk/react-native-sdk`](./sdk/react-native-sdk) | npm: `@adtogether/react-native-sdk` | Native SDK for React Native featuring full ad component integrations. |
| **🤖 Android** | [`./sdk/android-sdk`](./sdk/android-sdk) | Maven: `com.relaxsoftwareapps.adtogether:adtogether-sdk` | Native Kotlin SDK with full Jetpack Compose support, offering lifecycle-aware ad loading. |
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

Visit [https://www.ad-together.org](https://www.ad-together.org) to view the AdTogether dashboard.

---

### 2. Integrating the SDKs

Detailed instructions are provided in each SDK's local `README.md`. 

- **Web integration:** `npm install @adtogether/web-sdk`
- **React Native integration:** `npm install @adtogether/react-native-sdk`
- **Android integration:** Implement `com.relaxsoftwareapps.adtogether:adtogether-sdk:0.6.2` inside your `build.gradle.kts`.
- **iOS integration:** Add the Swift Package from `https://github.com/undecided2003/AdTogether.git`, or use `pod 'AdTogether', '~> 0.6.2'`.
- **Flutter integration:** Run `flutter pub add adtogether_sdk:^0.6.2`.
- **CMS / HTML:** Paste `<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>` and `<div data-ad-unit="YOUR_AD_UNIT_ID"></div>`.

---

## 🚀 Automated Publishing (CI/CD)

This repository heavily utilizes **GitHub Actions** for automated multi-platform continuous integration and deployment. 

Whenever a new version tag (e.g., `v1.0.0`) is pushed to the `main` branch, the deployment pipeline activates:
1. **Web**: Builds and publishes the TypeScript SDK to the **npm registry**.
2. **Android**: Assembles the AAR, generates JavaDocs, signs with GPG, and deploys to **Maven Central (Sonatype)**.
3. **iOS**: Builds the Swift package, mirrors and tags the CocoaPods source repository, then publishes the podspec to CocoaPods Trunk.
4. **Flutter**: Validates the codebase using `dart analyze` and builds the package structure for **pub.dev**.

After every registry job verifies the same release version, deploy the backend with `ADTOGETHER_PUBLISHED_SDK_VERSION` set to that version. The MCP server keeps source-version SDK guidance gated until this setting is updated, so it never directs an integrator to an unpublished SDK.

---

## 🤖 AI Assistant Integration (MCP)

AdTogether provides a **Model Context Protocol (MCP)** server for owner-scoped campaign and account tools. It accepts only a Firebase ID token for the signed-in account owner. An App ID is public application configuration and cannot authenticate an MCP request.

Use the Streamable HTTP endpoint: `https://www.ad-together.org/api/mcp`. Legacy SSE is disabled because its endpoint forwarding cannot safely carry an owner credential.

Configure a client that can send the authorization header on every request. For stdio clients:

```json
{
  "mcpServers": {
    "adtogether": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://www.ad-together.org/api/mcp",
        "--header",
        "Authorization: Bearer YOUR_FRESH_FIREBASE_ID_TOKEN"
      ]
    }
  }
}
```

Open the dashboard while signed in as the owner and use its **Copy fresh authorization header** control to obtain a fresh Firebase ID token. Treat it like a password, refresh it when the client expires it, and never place it in a URL or replace it with an App ID.

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
