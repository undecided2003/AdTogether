import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'lightningcss',
    'puppeteer',
    'firebase-admin'
  ],
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      config.externals = [...(config.externals || [])];
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      'tailwindcss': require.resolve('tailwindcss'),
    };
    return config;
  },
  // @ts-ignore
  turbopack: {
    root: __dirname,
    resolveAlias: {
      'tailwindcss': require.resolve('tailwindcss'),
    },
  },
} as any;

export default nextConfig;
