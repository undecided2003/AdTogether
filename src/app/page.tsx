import Link from 'next/link';
import { CodeBlock } from '@/components/CodeBlock';
import ExampleAdsButton from '@/components/ExampleAdsButton';

export default function Home() {
  const exampleCode = `"use client";
import { useState } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/web-sdk/react';

// Initialize the SDK with your App ID
if (typeof window !== 'undefined') {
  AdTogether.initialize({ appId: 'at_f57425e89a9545eda1162baeedb78636' });
}

export default function MyComponent() {
  const [showInterstitial, setShowInterstitial] = useState(false);

  return (
    <div className="p-4">
      <h1>My Awesome App</h1>
      
      {/* Earn 1 credit by displaying a banner ad */}
      <AdTogetherBanner 
        adUnitId="YOUR_AD_UNIT_ID" 
        onAdLoaded={() => console.log('Banner loaded!')} 
      />

      {/* Earn 5 credits by displaying an interstitial ad */}
      <button onClick={() => setShowInterstitial(true)}>
        Show Interstitial Ad
      </button>

      <AdTogetherInterstitial
        adUnitId="YOUR_AD_UNIT_ID"
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
      />
    </div>
  );
}`;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-32 animate-in fade-in duration-700 pt-8 md:pt-16 pb-24 text-left">
      
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row items-center gap-16 px-6">
        <div className="flex-1 space-y-8">
          <div className="inline-flex font-mono text-xs tracking-wider text-amber-700 dark:text-[#FFCE2A] uppercase border border-amber-300 dark:border-[#FFCE2A]/30 bg-amber-100 dark:bg-[#FFCE2A]/10 px-3 py-1 rounded">
            v0.1.10 Now Available
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.1] uppercase">
            Show an ad, <br/> get an ad shown
          </h1>

          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 font-normal leading-relaxed max-w-xl">
            AdTogether brings reciprocal marketing via ad exchange to independent creators. By embedding our lightweight, open-source SDK into your Android, iOS, Web, React, or Flutter app, you instantly join a completely moneyless ecosystem. Serve ads to your users to automatically earn credits, and spend those credits to promote your own projects globally — helping you increase conversions without spending a dime.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-6">
            <Link
              href="/dashboard"
              className="flex items-center justify-center rounded bg-[#FFCE2A] hover:bg-[#E5B821] text-black px-8 py-4 font-bold transition-colors duration-200"
            >
              Get Started
            </Link>
            <Link
              href="/docs"
              className="flex items-center justify-center rounded border border-zinc-300 dark:border-zinc-700 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-8 py-4 font-semibold transition-colors duration-200"
            >
              Read the Docs
            </Link>
            <ExampleAdsButton />
          </div>
        </div>
        
        {/* Code block right side */}
        <div className="flex-1 w-full max-w-2xl lg:ml-auto">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0A] overflow-hidden shadow-2xl">
            <div className="flex items-center px-4 py-3 bg-zinc-50 dark:bg-[#1A1A1A] border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
              </div>
              <span className="ml-4 text-xs font-mono text-zinc-500 dark:text-zinc-400">sdk-example.tsx</span>
            </div>
            <div className="p-2 bg-zinc-50 dark:bg-[#0A0A0A]">
              <CodeBlock language="tsx" code={exampleCode} />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div className="px-6 space-y-12">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-10 border-b border-zinc-200 dark:border-zinc-800 pb-6">Key Capabilities</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          <div className="space-y-4">
            <div className="text-amber-600 dark:text-[#FFCE2A] font-mono text-sm uppercase tracking-wide">01 / Reciprocal</div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Mutual Growth</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
              Stop paying for user acquisition. Display ads from other creators to generate credits, and use them to put your app in front of a worldwide audience. Increase conversions by reaching users who are already engaged with similar products.
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-amber-600 dark:text-[#FFCE2A] font-mono text-sm uppercase tracking-wide">02 / Seamless</div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Frictionless Integration</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
              Our drop-in SDKs make it effortless to join the exchange. With native support for Android, iOS, Web, React, and Flutter, you'll be up and running in minutes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-amber-600 dark:text-[#FFCE2A] font-mono text-sm uppercase tracking-wide">03 / Transparent</div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Fair-Trade Economy</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
              A transparent value exchange. Earn credits by showing ads and spend them to promote your own. Different ad formats have different weights, ensuring a level playing field and fair value for apps of all sizes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
