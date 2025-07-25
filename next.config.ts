// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Remove swcMinify since it's not needed in your version
  compiler: {
    // Alternative optimization options
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Keep all other configurations
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  webpack: (config) => {
    config.resolve.fallback = {
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase': false
    };
    config.resolve.alias = {
      handlebars: require.resolve('handlebars/dist/handlebars.min.js')
    };
    return config;
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'placehold.co' }]
  },
  reactStrictMode: true,
  trailingSlash: false
};

export default nextConfig;