import type { Metadata } from 'next';
import Link from 'next/link';
import { CodeBlock } from '@/components/CodeBlock';
import ExampleAdsButton from '@/components/ExampleAdsButton';
import WebsiteBuilderCard from '@/components/WebsiteBuilderCard';

export const metadata: Metadata = {
  title: 'Free Reciprocal Ad Exchange for App Developers',
  description:
    'AdTogether is a free reciprocal ad exchange platform. Embed our lightweight open-source SDK into your Android, iOS, Web, React, or Flutter app to earn credits by showing ads — then spend those credits to promote your own app globally. Increase conversions without spending a dime.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AdTogether | Free Reciprocal Ad Exchange for App Developers',
    description:
      'Show an ad, get an ad shown. Join a moneyless ad exchange ecosystem — earn credits by serving ads and promote your app to a global audience for free.',
    url: 'https://www.ad-together.org',
    type: 'website',
    images: [
      {
        url: '/adtogether_logo.webp',
        width: 1200,
        height: 630,
        alt: 'AdTogether — Free Reciprocal Ad Exchange for App Developers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdTogether | Free Reciprocal Ad Exchange for App Developers',
    description:
      'Show an ad, get an ad shown. Join a moneyless ad exchange ecosystem — earn credits by serving ads and promote your app to a global audience for free.',
    images: ['/adtogether_logo.webp'],
  },
};
import { 
  ReactLogo, 
  FlutterLogo, 
  AndroidLogo, 
  SwiftLogo,
  AppleLogo
} from '@/components/FrameworkLogos';

async function getNpmDownloads(pkg: string) {
  try {
    const res = await fetch(`https://api.npmjs.org/downloads/point/last-month/${pkg}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.downloads;
  } catch (e) {
    return null;
  }
}

async function getPubDownloads(pkg: string) {
  try {
    const res = await fetch(`https://pub.dev/api/packages/${pkg}/score`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.downloadCount30Days;
  } catch (e) {
    return null;
  }
}

function SdkCard({ title, repoName, url, statLabel, statValue, icon }: { title: string, repoName: string, url: string, statLabel: string, statValue: React.ReactNode, icon: React.ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col p-6 h-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0A] hover:border-amber-400 dark:hover:border-[#FFCE2A] transition-all group shadow-sm hover:shadow-md">
      <div className="w-10 h-10 mb-4 grayscale opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition-all flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-[#FFCE2A] transition-colors">{title}</h3>
      <p className="text-xs font-mono text-zinc-500 mt-1 truncate" title={repoName}>{repoName}</p>
      
      <div className="mt-auto pt-6 flex justify-between items-center text-sm border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-zinc-500">{statLabel}</span>
        <span className="font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs">{statValue ?? 'N/A'}</span>
      </div>
    </a>
  );
}

function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AdTogether',
    url: 'https://www.ad-together.org',
    logo: 'https://www.ad-together.org/adtogether_logo.webp',
    description:
      'Free reciprocal ad exchange platform for app developers. Earn credits by showing ads and spend them to promote your own app globally.',
    sameAs: [
      'https://www.instagram.com/adtogether0/',
      'https://www.youtube.com/@Ad-Together0',
      'https://www.tiktok.com/@adtogether0',
    ],
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AdTogether',
    url: 'https://www.ad-together.org',
    description:
      'Free reciprocal ad exchange for app developers. Show an ad, get an ad shown.',
    publisher: {
      '@type': 'Organization',
      name: 'AdTogether',
      logo: 'https://www.ad-together.org/adtogether_logo.webp',
    },
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AdTogether SDK',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Android, iOS, Web, Flutter, React Native',
    url: 'https://www.ad-together.org',
    description:
      'Open-source SDK for reciprocal ad exchange. Embed banner and interstitial ads in your app to earn credits and promote your own app globally.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </>
  );
}

export default async function Home() {
  const webSdkDownloads = await getNpmDownloads('@adtogether/web-sdk');
  const rnSdkDownloads = await getNpmDownloads('@adtogether/react-native-sdk');
  const flutterDownloads = await getPubDownloads('adtogether_sdk');
  
  const formatNum = (num: number | null) => num !== null ? new Intl.NumberFormat('en-US').format(num) : null;

  const exampleCode = `<!-- 1. Load the AdTogether Script -->
<script src="https://www.ad-together.org/sdk.js" data-app-id="YOUR_APP_ID" defer></script>

<!-- 2. Place this wherever you want the ad to appear -->
<div 
  data-ad-unit="home_banner" 
  style="width: 100%; min-height: 50px;"
></div>

<!-- That's it! You are now earning credits to promote your own site. -->`;

  return (
    <>
      <JsonLd />
      <div className="flex flex-col w-full max-w-7xl mx-auto space-y-20 md:space-y-32 animate-in fade-in duration-700 pt-4 md:pt-16 pb-16 md:pb-24 text-left">
      
      {/* Hero Section */}
      <div className="space-y-10 md:space-y-16">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
        <div className="flex-1 space-y-8">
          <div className="inline-flex font-mono text-xs tracking-wider text-amber-700 dark:text-[#FFCE2A] uppercase border border-amber-300 dark:border-[#FFCE2A]/30 bg-amber-100 dark:bg-[#FFCE2A]/10 px-3 py-1 rounded">
            v0.6.2 Now Available
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.1] uppercase">
            Show an ad, <br/> get an ad shown
          </h1>

          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 font-normal leading-relaxed max-w-xl">
            AdTogether brings reciprocal marketing to any website, mobile or desktop app. By pasting our lightweight snippet into your website or app, you instantly join a completely moneyless ecosystem. Serve ads to your users to automatically earn credits, and spend those credits to promote your own projects globally — helping you increase traffic without spending a dime.
          </p>

          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 font-normal leading-relaxed max-w-xl">
            Very little coding required — copy-paste code snippets, SDKs for web and mobile frameworks, or use our docs and MCP server with AI.
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
              <span className="ml-4 text-xs font-mono text-zinc-500 dark:text-zinc-400">index.html</span>
            </div>
            <div className="p-2 bg-zinc-50 dark:bg-[#0A0A0A]">
              <CodeBlock language="html" code={exampleCode} />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard preview */}
      <div className="mt-16 md:mt-24">
        <div className="mb-10 text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
            Your Developer Dashboard
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Track the performance of ads you&apos;re serving, watch your credits accumulate in real time, and
            launch campaigns to promote your own app — all from one place.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Decorative glow element */}
          <div className="absolute -inset-1 rounded-[1.5rem] bg-gradient-to-r from-amber-200 to-amber-500 opacity-20 blur-xl dark:opacity-10"></div>
          
          <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1A1A1A] shadow-2xl overflow-hidden">
            <div className="bg-zinc-100/50 dark:bg-[#0A0A0A] p-2 sm:p-4">
              <a
                href="/dashboard.webp"
                target="_blank"
                rel="noopener noreferrer"
                className="block cursor-pointer group relative rounded-lg overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm"
                title="Click to open the full-size dashboard image"
              >
                <div className="absolute inset-0 bg-zinc-900/0 group-hover:bg-zinc-900/10 dark:group-hover:bg-black/20 transition-all duration-300 z-10 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-5 py-2.5 rounded-full font-medium text-sm text-zinc-900 dark:text-white shadow-xl flex items-center border border-zinc-200 dark:border-zinc-700">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    View Full Dashboard
                  </div>
                </div>
                <img
                  src="/dashboard.webp"
                  alt="AdTogether Developer Dashboard"
                  className="w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Feature Sections */}
      <div className="space-y-8 md:space-y-12">
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
              Whether you use a no-code website builder like WordPress, Wix, and Squarespace, or build custom apps with React, Flutter, iOS, and Android — getting started takes just minutes.
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

      {/* Integrations Section */}
      <div className="space-y-8 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Integrations for Every Platform</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-lg">Use our simple HTML snippets for website builders, or open-source SDKs for custom apps.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
          <WebsiteBuilderCard />
          <SdkCard 
            title="Web & React" 
            repoName="@adtogether/web-sdk" 
            url="https://www.npmjs.com/package/@adtogether/web-sdk" 
            statLabel="Downloads/mo"
            statValue={formatNum(webSdkDownloads)}
            icon={<ReactLogo className="w-10 h-10" />} 
          />
          <SdkCard 
            title="React Native" 
            repoName="@adtogether/react-native-sdk" 
            url="https://www.npmjs.com/package/@adtogether/react-native-sdk" 
            statLabel="Downloads/mo"
            statValue={formatNum(rnSdkDownloads)}
            icon={<ReactLogo className="w-10 h-10" />} 
          />
          <SdkCard 
            title="Flutter" 
            repoName="adtogether_sdk" 
            url="https://pub.dev/packages/adtogether_sdk" 
            statLabel="Downloads/mo"
            statValue={formatNum(flutterDownloads)} 
            icon={<FlutterLogo className="w-10 h-10" />} 
          />
          <SdkCard 
            title="Android" 
            repoName="com.relaxsoftwareapps.adtogether" 
            url="https://central.sonatype.com/namespace/com.relaxsoftwareapps.adtogether" 
            statLabel="Registry"
            statValue="Maven Central" 
            icon={<AndroidLogo className="w-10 h-10" />} 
          />
          <SdkCard 
            title="iOS & Swift" 
            repoName="AdTogether" 
            url="https://github.com/undecided2003/AdTogether" 
            statLabel="Registry"
            statValue="SPM / CocoaPods" 
            icon={<SwiftLogo className="w-10 h-10" />} 
          />
        </div>
      </div>

      {/* Social Links Footer */}
      <div className="pt-12 md:pt-16 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Stay updated with the latest from AdTogether</p>
          </div>
          
          <div className="flex gap-6 justify-center">
            <a
              href="https://www.instagram.com/adtogether0/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-amber-50 dark:hover:bg-amber-950 hover:border-amber-400 dark:hover:border-[#FFCE2A] transition-all group"
              title="Instagram"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-[#FFCE2A] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.322a1.44 1.44 0 110-2.881 1.44 1.44 0 010 2.881z"/>
              </svg>
            </a>

            <a
              href="https://www.youtube.com/@Ad-Together0"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-amber-50 dark:hover:bg-amber-950 hover:border-amber-400 dark:hover:border-[#FFCE2A] transition-all group"
              title="YouTube"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-[#FFCE2A] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>

            <a
              href="https://www.tiktok.com/@adtogether0"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-amber-50 dark:hover:bg-amber-950 hover:border-amber-400 dark:hover:border-[#FFCE2A] transition-all group"
              title="TikTok"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-[#FFCE2A] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.6915026,4.4744748 C15.8782558,4.4744748 15.4872583,5.1686027 15.4872583,6.1274883 L15.4872583,14.0151496 C15.4872583,15.3590216 14.5769124,16.3393 13.3866995,16.3393 C12.1962513,16.3393 11.2872429,15.3590216 11.2872429,14.0151496 C11.2872429,12.6712777 12.1962513,11.6910037 13.3866995,11.6910037 L13.3866995,9.6528074 C10.5045493,9.6528074 8.19410979,11.8314901 8.19410979,14.0151496 C8.19410979,16.1984461 10.5045493,18.3771288 13.3866995,18.3771288 C16.2688496,18.3771288 18.5792891,16.1984461 18.5792891,14.0151496 L18.5792891,9.58413 C19.8695407,10.5644041 21.5103499,11.1741594 23.3096233,11.1741594 L23.3096233,9.13596306 C21.3975508,9.13596306 19.744141,8.15681146 18.7987155,6.71172349 L18.7987155,4.4744748 L16.6915026,4.4744748 Z"/>
              </svg>
            </a>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-500">© 2026 AdTogether. All rights reserved.</p>
        </div>
      </div>
      </div>
    </>
  );
}
