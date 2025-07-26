import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase': false,
      'private-next-rsc-*': false,
      handlebars: false
    };
    return config;
  },
  reactStrictMode: true,
  trailingSlash: false,
  output: 'standalone'
};

export default nextConfig;
