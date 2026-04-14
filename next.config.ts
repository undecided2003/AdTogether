import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'lightningcss',
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/firestore',
    'puppeteer'
  ],
  turbopack: {
    resolveAlias: {
      'tailwindcss': require.resolve('tailwindcss'),
      'firebase-admin/app': require.resolve('firebase-admin/app'),
      'firebase-admin/firestore': require.resolve('firebase-admin/firestore'),
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'tailwindcss': require.resolve('tailwindcss'),
      'firebase-admin/app': require.resolve('firebase-admin/app'),
      'firebase-admin/firestore': require.resolve('firebase-admin/firestore'),
    };
    return config;
  },
};

export default nextConfig;
