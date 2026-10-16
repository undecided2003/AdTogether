import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In or Sign Up',
  description:
    'Create a free AdTogether developer account or log in to start earning credits by showing ads and promoting your app through the reciprocal ad exchange.',
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}