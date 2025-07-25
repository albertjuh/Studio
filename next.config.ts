import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@opentelemetry/exporter-jaeger": false,
      "@genkit-ai/firebase": false
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: require.resolve("handlebars/dist/handlebars.min.js")
    };
    return config;
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "placehold.co" }]
  },
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: false
};

export default nextConfig;