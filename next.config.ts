import type { NextConfig } from "next";
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/~offline',
  },
});
const nextConfig: NextConfig = {};
export default withPWA(nextConfig);
