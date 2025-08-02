
import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
      "http": false,
      "https": false,
      "url": false,
      "zlib": false,
      "net": false,
      "tls": false,
      "pg-hstore": false,
      "@opentelemetry/api": false,
      "@opentelemetry/exporter-jaeger": false,
      "google-auth-library": false,
      "gcp-metadata": false,
    };
    return config;
  }
};

export default nextConfig;
