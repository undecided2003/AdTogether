import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a New Ad Campaign',
  description:
    'Create a new ad campaign on AdTogether. Upload your banner or interstitial ad, set targeting, and start earning credits to promote your app through the reciprocal ad exchange.',
  alternates: {
    canonical: '/create-ad',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateAdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}