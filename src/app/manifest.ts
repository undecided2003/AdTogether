import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AdTogether — Free Reciprocal Ad Exchange for App Developers',
    short_name: 'AdTogether',
    description:
      'Free reciprocal ad exchange platform. Show an ad, get an ad shown. Earn credits by displaying ads and promote your app globally.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/apple.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/adtogether_logo.webp',
        sizes: 'any',
        type: 'image/webp',
      },
    ],
  };
}