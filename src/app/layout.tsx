import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'AdTogether | Shown an ad, get an ad shown',
  description: 'AdTogether is your ad exchange platform where you earn credits by showing ads and spend them to get your app shown globally.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple.png',
  },
  openGraph: {
    title: 'AdTogether | Shown an ad, get an ad shown',
    description: 'AdTogether is a fair 1-to-1 ad exchange platform. Earn credits by showing ads — spend them to grow your app globally.',
    url: 'https://adtogether.relaxsoftwareapps.com',
    siteName: 'AdTogether',
    images: [{ url: '/adtogether_logo.png', width: 1200, height: 630, alt: 'AdTogether' }],
    type: 'website',
  },
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
        <main className="flex-grow pt-8 pb-12 px-6 md:px-12 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
