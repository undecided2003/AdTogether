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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${outfit.variable} font-sans antialiased bg-black text-white min-h-screen flex flex-col selection:bg-blue-500/30 selection:text-blue-200`}>
        <Navbar />
        <main className="flex-grow pt-24 pb-12 px-6 md:px-12 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
