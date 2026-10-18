"use client";

import Link from 'next/link';
import { useState } from 'react';
import {
  Terminal,
  Smartphone,
  Globe,
  Bot,
  Box,
  Layers,
  ArrowRight,
  Check,
  Copy,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { 
  ReactLogo, 
  FlutterLogo, 
  AndroidLogo, 
  AppleLogo,
  JavaScriptLogo,
  NextjsLogo,
  VueLogo,
  Html5Logo
} from '@/components/FrameworkLogos';
import McpServerConfig from '@/components/McpServerConfig';
import PlatformGuideModal, { Platform } from '@/components/PlatformGuideModal';

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

function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <a 
      href={src} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="relative group/zoom cursor-pointer overflow-hidden rounded-2xl block"
    >
      <img
        src={src}
        alt={alt}
        className={`${className} transition-transform duration-700 group-hover:scale-110`}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
         <div className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 text-white transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-2xl">
           <ExternalLink className="w-8 h-8 drop-shadow-lg" />
         </div>
      </div>
    </a>
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="group/code relative bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/5 rounded-xl overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/5 bg-zinc-200/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500/70" />
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-500 font-mono ml-2">{title}</span>
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-white/10 transition-all"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-white/10 transition-all opacity-0 group-hover/code:opacity-100"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-zinc-800 dark:text-zinc-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function DocsPage() {
  const [showAlert, setShowAlert] = useState(true);
  const [selectedCmsTab, setSelectedCmsTab] = useState<Platform>('wordpress');

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
            <strong>"Show an ad, get an ad shown"</strong> — the reciprocal ad exchange designed to <strong>increase conversions</strong> and grow your application&apos;s audience globally.
          </p>
        </header>
        
        {/* Important: Developer Account Required Notice */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200 dark:border-amber-500/20 rounded-3xl p-6 md:p-8 mb-12 shadow-xl shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                  <Info className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-amber-300">
                  Step 1: Create your Developer Account
                </h3>
              </div>
              
              <p className="text-zinc-700 dark:text-amber-100/70 text-lg leading-relaxed mb-6">
                Before you can integrate any SDK, you <strong>must</strong> first create a developer account to generate your <strong>appId</strong> and configure your ad units.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <a 
                  href="https://www.ad-together.org" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </a>
                <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900/50 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium">
                  <Check className="w-4 h-4 text-green-500" />
                  Free forever for developers
                </div>
              </div>
              
              <p className="text-zinc-500 dark:text-zinc-400 text-sm italic">
                * Integration will not work without a valid <strong>appId</strong> from the dashboard.
              </p>
            </div>
            
            <div className="flex-[1.4] w-full">
              <div className="relative border border-amber-200/50 dark:border-amber-500/20 rounded-2xl overflow-hidden shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                <ZoomableImage 
                  src="/dashboard.webp" 
                  alt="AdTogether Developer Dashboard" 
                  className="w-full aspect-video object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* AI Awareness Alert */}
        {showAlert && (
          <div className="relative bg-zinc-100/50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-2xl p-6 mb-16 flex items-start space-x-4">
            <button
              onClick={() => setShowAlert(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-500/10 transition-colors"
              aria-label="Close alert"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-3 bg-zinc-500/10 rounded-xl rounded-tl-none">
              <Bot className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Are you an AI Coding Assistant?
              </h3>
              <p className="text-zinc-600 dark:text-gray-400 leading-relaxed max-w-3xl pr-8 text-sm">
                We have provided optimized, machine-readable documentation files perfectly tuned for LLMs. Scroll down to the{' '}
                <a
                  href="#integration-guides"
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-4 font-semibold"
                >
                  Integration Guides
                </a>{' '}
                section below and click the "LLM" badge next to the platform you are building for to get the specific integration context, endpoints, and code snippets.
              </p>
              <McpServerConfig />
            </div>
          </div>
        )}

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
                    <div className="absolute top-1 right-1 z-10 p-0.5 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 pointer-events-none">
                      <X className="w-2.5 h-2.5 text-white/90" />
                    </div>
                    <ZoomableImage 
                      src="/previews/preview_standard.webp" 
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
                    <div className="absolute top-6 right-4 z-10 p-1 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 pointer-events-none shadow-sm">
                      <X className="w-4 h-4 text-white/90" />
                    </div>
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <ZoomableImage 
                        src="/previews/preview_premium.webp" 
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
            AdTogether is distributed as <strong className="text-zinc-900 dark:text-white">five SDK packages</strong> plus a{' '}
            <strong className="text-zinc-900 dark:text-white">lightweight HTML snippet</strong> for CMS and website builders — each
            optimized for its target platform. The Flutter SDK is special: it
            wraps the native Android and iOS cores under the hood, giving
            Flutter developers a single Dart API that works everywhere.
          </p>

          {/* Visual Architecture Diagram */}
          <div className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 md:p-10 overflow-hidden relative shadow-sm dark:shadow-none">
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
                    { label: 'Web (JS)', icon: <JavaScriptLogo className="w-4 h-4" />, color: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-500/10 border-pink-300 dark:border-pink-500/20' },
                    { label: 'React Native', icon: <ReactLogo className="w-4 h-4" />, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/10 border-cyan-300 dark:border-cyan-500/20' },
                    { label: 'Flutter (Dart)', icon: <FlutterLogo className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/20' },
                    { label: 'Native iOS (Swift)', icon: <AppleLogo className="w-4 h-4" />, color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/20' },
                    { label: 'Native Android (Kotlin)', icon: <AndroidLogo className="w-4 h-4" />, color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/20' },
                    { label: 'HTML Snippet (No-Code)', icon: <Globe className="w-4 h-4" />, color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/20 border-dashed' },
                  ].map(({ label, icon, color }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border ${color}`}
                    >
                      {icon}
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
                    { sdk: 'React Native SDK', platforms: 'React Native CLI, Expo' },
                    { sdk: 'Flutter SDK', platforms: 'Android + iOS + Web (one package)' },
                    { sdk: 'iOS SDK', platforms: 'SwiftUI / UIKit apps' },
                    { sdk: 'Android SDK', platforms: 'Compose / View-based apps' },
                    { sdk: 'HTML Snippet', platforms: 'WordPress, Wix, Squarespace, Weebly, Webflow' },
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
        <section id="integration-guides" className="mb-16 scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-xl">
              <Box className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold">Integration Guides</h2>
          </div>


          <div className="grid md:grid-cols-2 gap-8">
            {/* ─── CMS & Website Builders ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors relative overflow-hidden md:col-span-2">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl">
                    <Globe className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">CMS & Website Builders</h2>
                    <p className="text-zinc-600 dark:text-gray-400 text-sm mt-1">
                      Step-by-step guides for popular no-code platforms.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-black/50 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
                <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-white/10 hide-scrollbar">
                  {[
                    { id: 'wordpress', name: 'WordPress' },
                    { id: 'wix', name: 'Wix' },
                    { id: 'squarespace', name: 'Squarespace' },
                    { id: 'weebly', name: 'Weebly' },
                    { id: 'webflow', name: 'Webflow' }
                  ].map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedCmsTab(platform.id as Platform)}
                      className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                        selectedCmsTab === platform.id
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/5'
                          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {platform.name}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {selectedCmsTab === 'wordpress' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-zinc-900 dark:text-white">Add ads to WordPress</h4>
                      <ol className="list-decimal pl-5 space-y-3 text-zinc-600 dark:text-zinc-400">
                        <li><strong>Open your Page or Post editor:</strong> Navigate to the page or post where you want the ad to appear.</li>
                        <li><strong>Add a Custom HTML Block:</strong> Click the '+' button to add a new block, search for 'Custom HTML', and add it to your layout.</li>
                        <li><strong>Paste your code:</strong> Copy the HTML snippet below and paste it into the block. Click 'Preview' to test it.</li>
                      </ol>
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-900/50">
                        <strong>Site-wide Ads:</strong> Want ads on every page? Use a plugin like <strong>WPCode</strong> to automatically inject the script into your site&apos;s header or footer.
                      </div>
                    </div>
                  )}

                  {selectedCmsTab === 'wix' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-zinc-900 dark:text-white">Add ads to Wix</h4>
                      <ol className="list-decimal pl-5 space-y-3 text-zinc-600 dark:text-zinc-400">
                        <li><strong>Add an Embed Element:</strong> In the Wix Editor, click '+' (Add Elements) &gt; Embed Code &gt; Embed HTML.</li>
                        <li><strong>Paste the Snippet:</strong> Select 'Code', paste your snippet below, and click Update.</li>
                        <li><strong>Resize the Box:</strong> Drag the corners of the embed box to fit your desired banner size (e.g., 320x50 or 728x90).</li>
                      </ol>
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg text-sm border border-amber-100 dark:border-amber-900/50">
                        <strong>Wix Limitations:</strong> Wix places on-page embeds in a sandboxed iframe. For full-screen interstitials, you must inject the code via <strong>Settings &gt; Custom Code</strong> in your Wix Dashboard (requires Premium).
                      </div>
                    </div>
                  )}

                  {selectedCmsTab === 'squarespace' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-zinc-900 dark:text-white">Add ads to Squarespace</h4>
                      <ol className="list-decimal pl-5 space-y-3 text-zinc-600 dark:text-zinc-400">
                        <li><strong>Edit your page layout:</strong> Click 'Edit' on the page where you want the ad.</li>
                        <li><strong>Add a Code Block:</strong> Hover over an insertion point, click '+', and select the 'Code' block.</li>
                        <li><strong>Paste & Save:</strong> Make sure 'HTML' is selected and 'Display Source' is UNCHECKED. Paste your code and save.</li>
                      </ol>
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg text-sm border border-amber-100 dark:border-amber-900/50">
                        <strong>Editor Preview Disabled:</strong> Squarespace disables scripts while you are logged in to the editor. You must view your live site (or use an incognito window) to see the ad load.
                      </div>
                    </div>
                  )}

                  {selectedCmsTab === 'weebly' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-zinc-900 dark:text-white">Add ads to Weebly</h4>
                      <ol className="list-decimal pl-5 space-y-3 text-zinc-600 dark:text-zinc-400">
                        <li><strong>Drag the Embed Code element:</strong> From the left sidebar, find the 'Embed Code' (&lt;/&gt;) element and drag it onto your page.</li>
                        <li><strong>Edit Custom HTML:</strong> Click inside the element and select 'Edit Custom HTML'.</li>
                        <li><strong>Paste & Publish:</strong> Paste your snippet below. Publish your site to see the ad live.</li>
                      </ol>
                    </div>
                  )}

                  {selectedCmsTab === 'webflow' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg text-zinc-900 dark:text-white">Add ads to Webflow</h4>
                      <ol className="list-decimal pl-5 space-y-3 text-zinc-600 dark:text-zinc-400">
                        <li><strong>Add an Embed Component:</strong> Open the Add panel (+) and drag an 'Embed' component onto your canvas.</li>
                        <li><strong>Paste the Snippet:</strong> In the code editor window that appears, paste your snippet below.</li>
                        <li><strong>Publish to test:</strong> Webflow does not execute scripts in the Designer. Publish to your .webflow.io staging domain to test.</li>
                      </ol>
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-900/50">
                        <strong>Site-wide Head Code:</strong> If you want sitewide tracking, you can also place the script tag in your Project Settings &gt; Custom Code.
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-white/10">
                    <h5 className="text-sm font-semibold mb-3 uppercase tracking-wider text-zinc-500">Universal HTML Snippet</h5>
                    <CodeBlock language="html" title="HTML Snippet">
                      {`<!-- Load AdTogether SDK -->
<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>

<!-- Ad Banner Container -->
<div 
  data-ad-unit="YOUR_AD_UNIT_ID" 
  style="width: 100%; min-height: 50px;"
></div>`}
                    </CodeBlock>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Web Integration ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2.5 bg-pink-500/10 rounded-xl">
                  <ReactLogo className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold">Web SDK</h2>
                  <Link href="/llms-web.txt" prefetch={false} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 rounded hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    LLM
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-pink-300 dark:border-pink-500/30 text-pink-600 dark:text-pink-400">
                  <Html5Logo className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">HTML</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-pink-300 dark:border-pink-500/30 text-pink-600 dark:text-pink-400">
                  <ReactLogo className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">React</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-pink-300 dark:border-pink-500/30 text-pink-600 dark:text-pink-400">
                  <NextjsLogo className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Next.js</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-pink-300 dark:border-pink-500/30 text-pink-600 dark:text-pink-400">
                  <VueLogo className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Vue</span>
                </div>
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
                {`"use client";
import { useState } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/web-sdk/react';

if (typeof window !== 'undefined') {
  AdTogether.initialize({ appId: 'YOUR_APP_ID' });
}

export default function MyComponent() {
  const [showAd, setShowAd] = useState(false);

  return (
    <div>
      {/* Banner Ad */}
      <AdTogetherBanner 
        adUnitId="YOUR_AD_UNIT_ID" 
        onAdLoaded={() => console.log('Ad loaded!')}
      />
      
      {/* Interstitial Ad */}
      <button onClick={() => setShowAd(true)}>Show Interstitial</button>
      <AdTogetherInterstitial 
        adUnitId="YOUR_AD_UNIT_ID" 
        isOpen={showAd} 
        onClose={() => setShowAd(false)} 
        onAdLoaded={() => console.log('Interstitial loaded!')}
      />
    </div>
  );
}`}
              </CodeBlock>

              <div className="mt-6">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                  Alternative: Plain HTML (CDN)
                </p>
                <CodeBlock language="html" title="index.html">
                  {`<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>
<!-- Banner Ad -->
<div id="adtogether-ad" data-ad-unit="YOUR_AD_UNIT_ID"></div>`}
                </CodeBlock>
              </div>
            </section>

            {/* ─── Flutter Integration ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/20 rounded-full text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                3-in-1
              </div>

              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <FlutterLogo className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold">Flutter SDK</h2>
                  <Link href="/llms-flutter.txt" prefetch={false} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 rounded hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    LLM
                  </Link>
                </div>
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
  onAdFailedToLoad: (e) => print('Error: $e'),
)

// Show Interstitial
AdTogetherInterstitial.show(
  context: context,
  adUnitId: 'YOUR_AD_UNIT_ID',
  closeDelay: const Duration(seconds: 3),
  onAdLoaded: () => print('Interstitial loaded!'),
);`}
              </CodeBlock>
            </section>

            {/* ─── Native iOS ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2.5 bg-orange-500/10 rounded-xl">
                  <AppleLogo className="w-7 h-7 text-orange-500" />
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold">Native iOS SDK</h2>
                  <Link href="/llms-ios.txt" prefetch={false} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 rounded hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    LLM
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <PlatformBadge label="SwiftUI" color="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30" />
                <PlatformBadge label="UIKit" color="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30" />
                <PlatformBadge label="App Attest" color="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30" />
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6">
                Pure Swift SDK for native iOS and iPadOS apps with built-in Apple App Attest support. Distributed via
                Swift Package Manager and CocoaPods.
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Distribution
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                Swift Package Manager or CocoaPods
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                1. Add Package
              </p>
              <CodeBlock title="Package.swift">
{`.package(
  url: "https://github.com/undecided2003/AdTogether.git",
  from: "0.6.0"
)`}
              </CodeBlock>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                CocoaPods alternative
              </p>
              <CodeBlock language="ruby" title="Podfile">
{`pod 'AdTogether', '~> 0.6.0'`}
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
            AdTogetherView(
                adUnitId: "YOUR_AD_UNIT_ID",
                onAdLoaded: { print("Ad loaded!") }
            )
            .frame(height: 50)
            
            // Interstitial Ad
            Button("Show Interstitial") {
                showAd = true
            }
            .fullScreenCover(isPresented: $showAd) {
                AdTogetherInterstitialView(
                    adUnitId: "YOUR_AD_UNIT_ID",
                    closeDelay: 3,
                    onAdLoaded: { print("Interstitial loaded!") }
                ) { showAd = false }
            }
        }
    }
}`}
              </CodeBlock>
            </section>

            {/* ─── Native Android ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  <AndroidLogo className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold">Native Android SDK</h2>
                  <Link href="/llms-android.txt" prefetch={false} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 rounded hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    LLM
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <PlatformBadge label="Jetpack Compose" color="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30" />
                <PlatformBadge label="XML Views" color="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30" />
                <PlatformBadge label="Play Integrity" color="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30" />
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6">
                Kotlin-first SDK for native Android apps with Google Play Integrity attestation. Distributed via Maven
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
    implementation("com.relaxsoftwareapps.adtogether:adtogether-sdk:0.6.0")
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
            modifier = Modifier.fillMaxWidth().height(50.dp),
            onAdLoaded = { println("Ad loaded!") }
        )
        
        // Interstitial Ad
        Button(onClick = { showAd = true }) {
            Text("Show Interstitial")
        }
        
        if (showAd) {
            AdTogetherInterstitial(
                adUnitId = "YOUR_AD_UNIT_ID",
                closeDelay = 3,
                onDismiss = { showAd = false },
                onAdLoaded = { println("Interstitial loaded!") }
            )
        }
    }
}`}
              </CodeBlock>
            </section>

            {/* ─── React Native ─── */}
            <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors md:col-span-2">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold">React Native SDK</h2>
                  <Link href="/llms-react-native.txt" prefetch={false} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 rounded hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    LLM
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <PlatformBadge label="Expo" color="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/30" />
                <PlatformBadge label="React Native CLI" color="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/30" />
              </div>
              <p className="text-zinc-600 dark:text-gray-400 mb-6">
                Official support for React Native applications. Easy drop-in components
                to monetize your mobile apps.
              </p>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Distribution
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                NPM Package
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                    1. Install
                  </p>
                  <CodeBlock language="bash" title="terminal">
                    {`npm install @adtogether/react-native-sdk`}
                  </CodeBlock>

                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3 mt-6">
                    2. Initialize
                  </p>
                  <CodeBlock language="tsx" title="App.tsx">
{`import { AdTogether } from '@adtogether/react-native-sdk';

// Call before rendering ad components
AdTogether.initialize({ appId: 'YOUR_APP_ID' });`}
                  </CodeBlock>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider mb-3">
                    3. Usage
                  </p>
                  <CodeBlock language="tsx" title="MyScreen.tsx">
{`import { useState } from 'react';
import { View, Button } from 'react-native';
import { 
  AdTogetherBanner, 
  AdTogetherInterstitial 
} from '@adtogether/react-native-sdk';

export default function MyScreen() {
  const [showAd, setShowAd] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* Banner Ad */}
      <AdTogetherBanner 
        adUnitId="YOUR_AD_UNIT_ID" 
        onAdLoaded={() => console.log('Ad loaded!')}
      />
      
      {/* Interstitial Ad */}
      <Button 
        title="Show Interstitial" 
        onPress={() => setShowAd(true)} 
      />
      
      <AdTogetherInterstitial 
        adUnitId="YOUR_AD_UNIT_ID" 
        isOpen={showAd} 
        onClose={() => setShowAd(false)} 
        onAdLoaded={() => console.log('Interstitial loaded!')}
      />
    </View>
  );
}`}
                  </CodeBlock>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
