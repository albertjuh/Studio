// No auth, no export - pure dynamic hosting
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: false, // Match your routing preference
  images: {
    unoptimized: true // Required for Vercel optimization
  }
};

export default nextConfig;