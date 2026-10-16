import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

const SITE_URL = 'https://www.ad-together.org';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AdTogether | Free Reciprocal Ad Exchange for App Developers',
    template: '%s | AdTogether',
  },
  description:
    'AdTogether is a free reciprocal ad exchange platform for app developers. Earn credits by showing ads in your Android, iOS, Web, React, or Flutter app — spend them to get your own app promoted globally. Increase conversions without spending a dime.',
  keywords: [
    'reciprocal ad exchange',
    'free ad exchange',
    'app promotion',
    'app marketing',
    'cross-promotion',
    'ad network for indie developers',
    'increase app conversions',
    'free app advertising',
    'mobile ad exchange',
    'banner ads',
    'interstitial ads',
    'Android SDK',
    'iOS SDK',
    'Flutter SDK',
    'React Native SDK',
    'Web SDK',
    'open source ad network',
    'user acquisition',
    'app growth',
    'indie app developer',
  ],
  authors: [{ name: 'AdTogether' }],
  creator: 'AdTogether',
  publisher: 'AdTogether',
  category: 'technology',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple.png',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'AdTogether',
    title: 'AdTogether | Free Reciprocal Ad Exchange for App Developers',
    description:
      'Show an ad, get an ad shown. AdTogether is a fair 1-to-1 ad exchange platform to increase conversions and grow your audience. Earn credits by showing ads — spend them to grow your app globally.',
    images: [
      {
        url: '/adtogether_logo.webp',
        width: 1200,
        height: 630,
        alt: 'AdTogether — Free Reciprocal Ad Exchange for App Developers',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdTogether | Free Reciprocal Ad Exchange for App Developers',
    description:
      'Show an ad, get an ad shown. Earn credits by showing ads in your app — spend them to promote your own app globally. Free for developers.',
    images: ['/adtogether_logo.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  appleWebApp: {
    title: 'AdTogether',
    statusBarStyle: 'black-translucent',
  },
  appLinks: {
    web: {
      url: SITE_URL,
      should_fallback: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${outfit.variable} font-sans antialiased bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white min-h-screen flex flex-col selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200`}>
        <Navbar />
        <main className="flex-grow pt-6 md:pt-8 pb-12 px-4 md:px-8 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}