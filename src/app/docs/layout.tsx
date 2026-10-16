import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SDK Documentation & Integration Guides',
  description:
    'Complete AdTogether SDK documentation for Android, iOS, Web, React, React Native, and Flutter. Learn how to integrate banner and interstitial ads, earn credits, and promote your app through the reciprocal ad exchange.',
  alternates: {
    canonical: '/docs',
  },
  openGraph: {
    title: 'AdTogether SDK Documentation & Integration Guides',
    description:
      'Complete integration guides for the AdTogether reciprocal ad exchange SDK. Available for Android, iOS, Web, React, React Native, and Flutter.',
    url: 'https://www.ad-together.org/docs',
    type: 'website',
    images: [
      {
        url: '/adtogether_logo.webp',
        width: 1200,
        height: 630,
        alt: 'AdTogether SDK Documentation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdTogether SDK Documentation & Integration Guides',
    description:
      'Complete integration guides for the AdTogether reciprocal ad exchange SDK. Available for Android, iOS, Web, React, React Native, and Flutter.',
    images: ['/adtogether_logo.webp'],
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}