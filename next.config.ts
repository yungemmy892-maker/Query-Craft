import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Suppress hydration warnings from theme attribute
  reactStrictMode: true,
};

export default nextConfig;
