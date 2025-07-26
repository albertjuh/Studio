
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      fs: false,
      path: false,
      '@opentelemetry/exporter-jaeger': false,
      '@genkit-ai/firebase': false
    };
    return config;
  }
};

module.exports = nextConfig;
