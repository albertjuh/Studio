
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
      "@opentelemetry/exporter-jaeger": false,
    };
    return config;
  }
};

export default nextConfig;
