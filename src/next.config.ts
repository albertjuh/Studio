
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Core Build Configuration
  typescript: {
    ignoreBuildErrors: false, // Keep type checking enabled
  },
  eslint: {
    ignoreDuringBuilds: false, // Keep linting enabled
  },

  // Webpack Resolution Fixes
  webpack: (config) => {
    // Handle problematic modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase': false,
    };

    // Fix Handlebars warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: require.resolve('handlebars/dist/handlebars.min.js'),
    };

    return config;
  },

  // Essential Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },

  // Recommended Base Settings
  reactStrictMode: true,
  trailingSlash: false,
};

export default nextConfig;
