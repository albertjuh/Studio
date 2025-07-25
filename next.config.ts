import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: [
      '@genkit-ai/core',
      '@genkit-ai/next',
      '@opentelemetry/sdk-node',
      'genkit'
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // RSC-related modules
      'private-next-rsc-server-reference': false,
      'private-next-rsc-action-encryption': false,
      'private-next-rsc-action-validate': false,
      // Other problematic modules
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase': false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: require.resolve('handlebars/dist/handlebars.min.js'),
    };
    return config;
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'placehold.co' }],
  },
  reactStrictMode: true,
  trailingSlash: false,
};

export default nextConfig;
