
import Link from 'next/link';
import {
  Terminal,
  Smartphone,
  Globe,
  Bot,
  Box,
  Layers,
  ArrowRight,
  Check,
  Info,
} from 'lucide-react';

function PlatformBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}
    >
      <Check className="w-3 h-3" />
      {label}
    </span>
  );
}

function CodeBlock({
  children,
  language,
  title,
}: {
  children: string;
  language?: string;
  title?: string;
}) {
  return (
    <div className="bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/5 rounded-xl overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-white/5 bg-zinc-200/50 dark:bg-white/[0.02]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500/70" />
          </div>
          <span className="text-xs text-zinc-600 dark:text-zinc-500 font-mono ml-2">{title}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-zinc-800 dark:text-zinc-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="text-zinc-900 dark:text-white">
      <div className="max-w-5xl mx-auto pb-24">
        {/* Header Section */}
        <header className="mb-16">
          <div className="inline-block px-3 py-1 mb-6 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 text-sm font-medium">
            Developer Documentation
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Integrate{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              AdTogether
            </span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            <strong>"Show an ad, get an ad shown"</strong> — the reciprocal ad exchange designed to <strong>increase conversions</strong> and grow your application's audience globally.
          </p>
        </header>

        {/* AI Awareness Alert */}
        <div className="bg-amber-100/50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 rounded-2xl p-6 mb-16 flex items-start space-x-4">
          <div className="p-3 bg-amber-500/20 rounded-xl rounded-tl-none">
            <Bot className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">
              Are you an AI Coding Assistant?
            </h3>
            <p className="text-zinc-600 dark:text-gray-400 leading-relaxed max-w-3xl">
              We have provided a machine-readable documentation file format
              perfectly tuned for LLMs. Read the{' '}
              <Link
                href="/llms.txt"
                className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-4"
              >
                /llms.txt
              </Link>{' '}
              file at the root of this domain for the optimal integration
              context, endpoints, and code snippets.
            </p>
          </div>
        </div>

        {/* ── Visualizing the Experience ─────────────────── */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl">
              <Globe className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold">Standard Ad Formats</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="group relative bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 overflow-hidden transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.05] md:h-[650px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold">Native Banner</h3>
                 <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md border border-indigo-500/20 uppercase tracking-wider font-semibold">Web & Mobile</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-gray-400 mb-8">
                Inline banner ads that adapt to their container. Perfect for headers, footers, or content breaks.
              </p>
              
              <div className="flex-grow flex items-center justify-center">
                {/* Mock Feed UI */}
                <div className="w-full max-w-[400px] border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl bg-white dark:bg-zinc-900/50">
                  <div className="p-3 border-b border-zinc-100 dark:border-white/5 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="w-20 h-2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                    <div className="w-3/4 h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                  </div>
                  
                  {/* The Actual Ad (Pure Image from public/ads) */}
                  <div className="mx-4 mb-4 bg-black rounded-xl border border-zinc-200 dark:border-indigo-500/30 overflow-hidden shadow-lg relative group/ad aspect-[3.9/1]">
                    <img 
                      src="/ads/Banner_Example.png" 
                      alt="Banner Ad" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="p-4 border-t border-zinc-100 dark:border-white/5 flex justify-between">
                    <div className="w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 overflow-hidden transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.05] md:h-[650px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-bold">Interstitial</h3>
                 <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md border border-indigo-500/20 uppercase tracking-wider font-semibold">Web & Mobile</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-gray-400 mb-8">
                Full-screen immersive experiences during natural application transitions.
              </p>
              
              <div className="flex-grow flex items-center justify-center">
                <div className="w-[230px] aspect-[9/19] bg-zinc-900 rounded-[3rem] p-2.5 border-4 border-zinc-800 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                  {/* Phone Screen */}
                  <div className="w-full h-full bg-black rounded-[2.2rem] overflow-hidden relative border border-zinc-700 flex flex-col">
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <img 
                        src="/ads/Interstitial_Example.png" 
                        alt="Interstitial Ad Example" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Architecture Overview ────────────────────────── */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-xl">
              <Layers className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold">SDK Architecture</h2>
          </div>

          <p className="text-zinc-600 dark:text-gray-400 max-w-3xl mb-8 leading-relaxed">
            AdTogether is distributed as <strong className="text-zinc-900 dark:text-white">four separate SDK packages</strong> — each
            optimized for its target platform. The Flutter SDK is special: it
            wraps the native Android and iOS cores under the hood, giving
            Flutter developers a single Dart API that works everywhere.
          </p>

          {/* Visual Architecture Diagram */}
          <div className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 md:p-10 overflow-hidden relative shadow-sm dark:shadow-none">
            <div className="absolute top-0 left-0 w-80 h-80 bg-amber-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Top Row: Entry Points */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
              {/* Developer Entry Points */}
              <div className="flex-1 space-y-4">
                <h4 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold mb-4">
                  Developer Entry Points
                </h4>

                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Web (JS)', color: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-500/10 border-pink-300 dark:border-pink-500/20' },
                    { label: 'Flutter (Dart)', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/20' },
                    { label: 'Native iOS (Swift)', color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/20' },
                    { label: 'Native Android (Kotlin)', color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/20' },
                  ].map(({ label, color }) => (
                    <span
                      key={label}
                      className={`text-sm font-medium px-4 py-2 rounded-xl border ${color}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center pt-8">
                <ArrowRight className="w-6 h-6 text-zinc-600" />
              </div>

              {/* Platforms Served */}
              <div className="flex-1 space-y-4">
                <h4 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold mb-4">
                  Platforms Served
                </h4>
                <div className="bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 space-y-3">
                  {[
                    { sdk: 'Web SDK', platforms: 'Websites, SPAs, SSR apps' },
                    { sdk: 'Flutter SDK', platforms: 'Android + iOS + Web (one package)' },
                    { sdk: 'iOS SDK', platforms: 'SwiftUI / UIKit apps' },
                    { sdk: 'Android SDK', platforms: 'Compose / View-based apps' },
                  ].map(({ sdk, platforms }) => (
                    <div key={sdk} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-zinc-900 dark:text-white font-medium text-sm">{sdk}</span>
                        <span className="text-zinc-600 dark:text-zinc-500 text-sm"> → {platforms}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Flutter Internal Architecture */}
            <div className="mt-10 border-t border-zinc-200 dark:border-white/5 pt-8 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  How the Flutter SDK works internally
                </h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    dir: 'lib/',
                    desc: 'Unified Dart API — AdTogetherBanner, AdTogetherInterstitial, initialization.',
                    color: 'border-amber-500/20',
                  },
                  {
                    dir: 'android/',
                    desc: 'Kotlin plugin — uses Platform Channels to call the native Android ad renderer.',
                    color: 'border-purple-500/20',
                  },
                  {
                    dir: 'ios/',
                    desc: 'Swift plugin — uses Platform Channels to call the native iOS ad renderer.',
                    color: 'border-orange-500/20',
                  },
                ].map(({ dir, desc, color }) => (
                  <div key={dir} className={`bg-zinc-100 dark:bg-black/30 rounded-xl border ${color} p-4`}>
                    <code className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">{dir}</code>
                    <p className="text-zinc-600 dark:text-zinc-500 text-xs mt-2 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-zinc-600 dark:text-zinc-500 text-xs mt-4">
                On <strong className="text-zinc-900 dark:text-zinc-400">Flutter Web</strong>, the SDK renders
                ads using an <code className="text-pink-600 dark:text-pink-400/80 bg-pink-100 dark:bg-pink-500/10 px-1 rounded">HtmlElementView</code> that
                loads the Web SDK (<code className="text-pink-600 dark:text-pink-400/80 bg-pink-100 dark:bg-pink-500/10 px-1 rounded">sdk.js</code>) under
                the hood — no native plugin required.
              </p>
            </div>
          </div>
        </section>

        {/* ── Platform Integration Cards ──────────────────── */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-xl">
              <Box className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold">Integration Guides</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* ─── REST API ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors md:col-span-2">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                  <Globe className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-semibold">REST API endpoints</h2>
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6 max-w-3xl">
                For complete control, or if you are building an integration for a custom platform, you can directly interact with the AdTogether Ad Serving REST API.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                    Fetch Ad
                  </p>
                  <CodeBlock language="bash" title="GET /api/ads/serve">
{`curl -X GET "https://adtogether.relaxsoftwareapps.com/api/ads/serve?country=global"`}
                  </CodeBlock>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                    Track Impression
                  </p>
                  <CodeBlock language="bash" title="POST /api/ads/impression">
{`curl -X POST "https://adtogether.relaxsoftwareapps.com/api/ads/impression" \\
  -H "Content-Type: application/json" \\
  -d '{"adId": "123456", "token": "HMAC_TOKEN_FROM_FETCH"}'`}
                  </CodeBlock>
                </div>
              </div>
            </section>

            {/* ─── Web Integration ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-pink-500/20 rounded-xl text-pink-400">
                  <Globe className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-semibold">Web SDK</h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <PlatformBadge label="HTML" color="text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-500/30" />
                <PlatformBadge label="React" color="text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-500/30" />
                <PlatformBadge label="Next.js" color="text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-500/30" />
                <PlatformBadge label="Vue" color="text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-500/30" />
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6">
                Embed ads into any webpage using our lightweight script. Zero
                dependencies — works with any framework.
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Distribution
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                NPM Package (React/Next.js) or CDN-hosted script tag.
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                1. Install (React/Next.js)
              </p>
              <CodeBlock language="bash" title="terminal">
                {`npm install @adtogether/web-sdk`}
              </CodeBlock>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                2. Usage (React)
              </p>
              <CodeBlock language="tsx" title="MyComponent.tsx">
                {`import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner } from '@adtogether/web-sdk/react';

AdTogether.initialize({ appId: 'YOUR_APP_ID' });

export default function MyComponent() {
  return <AdTogetherBanner adUnitId="YOUR_AD_UNIT_ID" />;
}`}
              </CodeBlock>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                Alternative: Plain HTML (CDN)
              </p>
              <CodeBlock language="html" title="index.html">
                {`<script src="https://adtogether.relaxsoftwareapps.com/sdk.js" defer></script>
<!-- Banner Ad -->
<div id="adtogether-ad" data-ad-unit="YOUR_AD_UNIT_ID"></div>`}
              </CodeBlock>
            </section>

            {/* ─── Flutter Integration ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/20 rounded-full text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                3-in-1
              </div>

              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-semibold">Flutter SDK</h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <PlatformBadge label="Android" color="text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30" />
                <PlatformBadge label="iOS" color="text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30" />
                <PlatformBadge label="Web" color="text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30" />
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6">
                One Dart package — full cross-platform coverage. Uses native
                platform channels on mobile and the Web SDK under the hood for
                Flutter Web.
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Distribution
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                <code className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">pub.dev</code> package
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                1. Install
              </p>
              <CodeBlock title="terminal">
                {`flutter pub add adtogether_sdk`}
              </CodeBlock>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                2. Initialize
              </p>
              <CodeBlock language="dart" title="main.dart">
{`import 'package:adtogether_sdk/adtogether_sdk.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AdTogether.initialize(appId: 'YOUR_APP_ID');
  runApp(MyApp());
}`}
              </CodeBlock>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                3. Show Ad
              </p>
              <CodeBlock language="dart" title="my_page.dart">
{`// Show Banner
AdTogetherBanner(
  adUnitId: 'YOUR_AD_UNIT_ID',
  size: AdSize.banner,
  onAdLoaded: () => print('Ad loaded!'),
  onAdFailedToLoad: (e) => print('Error: \$e'),
)

// Show Interstitial
AdTogetherInterstitial.show(
  context: context,
  adUnitId: 'YOUR_AD_UNIT_ID',
  closeDelay: Duration(seconds: 3),
);`}
              </CodeBlock>
            </section>

            {/* ─── Native iOS ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-semibold">Native iOS SDK</h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <PlatformBadge label="SwiftUI" color="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30" />
                <PlatformBadge label="UIKit" color="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30" />
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6">
                Pure Swift SDK for native iOS and iPadOS apps. Distributed via
                Swift Package Manager.
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Distribution
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                Swift Package Manager — add via Xcode or <code className="text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/10 px-1.5 py-0.5 rounded">Package.swift</code>
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                1. Add Package
              </p>
              <CodeBlock title="Package.swift">
{`.package(
  url: "https://github.com/undecided2003/AdTogether.git",
  from: "0.1.1"
)`}
              </CodeBlock>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                2. Initialize &amp; Display
              </p>
              <CodeBlock language="swift" title="ContentView.swift">
{`import AdTogether

@main
struct MyApp: App {
    init() {
        AdTogether.initialize(appId: "YOUR_APP_ID")
    }

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

struct ContentView: View {
    @State private var showAd = false

    var body: some View {
        VStack {
            Text("My App")
            
            // Banner Ad
            AdTogetherView(adUnitID: "YOUR_AD_UNIT_ID")
                .frame(height: 50)
            
            // Interstitial Ad
            Button("Show Interstitial") {
                showAd = true
            }
            .fullScreenCover(isPresented: $showAd) {
                AdTogetherInterstitialView(adUnitID: "YOUR_AD_UNIT_ID") {
                    showAd = false
                }
            }
        }
    }
}`}
              </CodeBlock>
            </section>

            {/* ─── Native Android ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-semibold">Native Android SDK</h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <PlatformBadge label="Jetpack Compose" color="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30" />
                <PlatformBadge label="XML Views" color="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30" />
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6">
                Kotlin-first SDK for native Android apps. Distributed via Maven
                Central.
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Distribution
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                Maven Central — add to <code className="text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/10 px-1.5 py-0.5 rounded">build.gradle.kts</code>
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                1. Add Dependency
              </p>
              <CodeBlock title="build.gradle.kts">
{`dependencies {
    implementation("com.adtogether:sdk:0.1.1")
}`}
              </CodeBlock>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                2. Initialize &amp; Display
              </p>
              <CodeBlock language="kotlin" title="MainActivity.kt">
{`import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.views.AdTogetherView
import com.adtogether.sdk.views.AdTogetherInterstitial

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AdTogether.initialize(this, "YOUR_APP_ID")
    }
}

@Composable
fun MainScreen() {
    var showAd by remember { mutableStateOf(false) }

    Column {
        Text("My App")
        
        // Banner Ad
        AdTogetherView(
            adUnitId = "YOUR_AD_UNIT_ID",
            modifier = Modifier.fillMaxWidth().height(50.dp)
        )
        
        // Interstitial Ad
        Button(onClick = { showAd = true }) {
            Text("Show Interstitial")
        }
        
        if (showAd) {
            AdTogetherInterstitial(
                adUnitId = "YOUR_AD_UNIT_ID",
                closeDelay = 3,
                onDismiss = { showAd = false }
            )
        }
    }
}`}
              </CodeBlock>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
