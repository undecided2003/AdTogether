import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/create-ad', '/edit-ad', '/login', '/api/'],
      },
    ],
    sitemap: 'https://www.ad-together.org/sitemap.xml',
    host: 'https://www.ad-together.org',
  };
}