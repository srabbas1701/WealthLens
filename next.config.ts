import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Mark openai as an external package for server-side
  serverExternalPackages: ['openai'],

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
