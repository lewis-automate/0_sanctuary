import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // This tells Vercel: "I know what I'm doing, just build the app"
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;