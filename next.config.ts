import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  // Performance optimizations
  swcMinify: true,
  compress: true,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Output optimization
  output: 'standalone',
  // Enable React strict mode for better development experience
  reactStrictMode: true,
};

export default nextConfig;
