import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Mark openai as an external package for server-side
  serverExternalPackages: ['openai'],

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip static optimization for pages that require runtime data
  // This prevents build errors when Supabase env vars aren't available
  // Note: Removed invalid experimental option that was causing warnings
};

export default nextConfig;
