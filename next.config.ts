import type { NextConfig } from "next";
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  skipWaiting: true,
  clientsClaim: true,
  buildExcludes: [/middleware-manifest\.json$/],
  cacheStartUrl: false,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/~offline',
  },
});
const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};
export default withPWA(nextConfig);
