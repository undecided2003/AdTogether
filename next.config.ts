import type { NextConfig } from "next";

let tailwindPath = "";
try {
  tailwindPath = require.resolve("tailwindcss");
} catch (e) {
  // Ignore at runtime in production when devDependencies are not installed
}

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'lightningcss',
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/auth',
    'firebase-admin/firestore',
    '@modelcontextprotocol/sdk',
  ],
  // Proxy Firebase Auth handler so signInWithRedirect works on localhost.
  // In production (Firebase Hosting), /__/auth/* is served natively.
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://adtogether-15453.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/__/firebase/:path*',
        destination: 'https://adtogether-15453.firebaseapp.com/__/firebase/:path*',
      },
    ];
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'firebase-admin',
        'firebase-admin/app',
        'firebase-admin/auth',
        'firebase-admin/firestore',
      ];
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      ...(tailwindPath ? { 'tailwindcss': tailwindPath } : {}),
    };
    return config;
  },
  // @ts-ignore
  turbopack: {
    root: __dirname,
    resolveAlias: {
      ...(tailwindPath ? { 'tailwindcss': tailwindPath } : {}),
    },
    external: [
      'firebase-admin',
      'firebase-admin/app',
      'firebase-admin/auth',
      'firebase-admin/firestore',
    ],
  },
} as any;

export default nextConfig;
