import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable type checking during build (temporary)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase': false,
      'private-next-rsc-server-reference': false,
      'private-next-rsc-action-encryption': false,
      'private-next-rsc-action-validate': false
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: require.resolve('handlebars/dist/handlebars.min.js')
    };
    return config;
  },
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: [
      '@genkit-ai/core',
      '@opentelemetry/sdk-node'
    ]
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "placehold.co" }]
  },
  reactStrictMode: true,
  trailingSlash: false,
};

export default nextConfig;
