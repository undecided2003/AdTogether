import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developer Dashboard',
  description:
    'Manage your AdTogether developer account — track ad impressions, clicks, and credits. Create ad units, generate App IDs, and monitor your reciprocal ad exchange performance.',
  alternates: {
    canonical: '/dashboard',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}