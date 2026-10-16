import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Ad Campaign',
  description:
    'Edit your AdTogether ad campaign — update your banner or interstitial ad creative, adjust targeting, and manage your reciprocal ad exchange credits.',
  alternates: {
    canonical: '/edit-ad',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditAdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}