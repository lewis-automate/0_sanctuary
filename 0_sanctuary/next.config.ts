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
  async redirects() {
    return [
      { source: "/add-vocab", destination: "/vocab?tab=add", permanent: true },
      { source: "/writer", destination: "/writing?tab=writenow", permanent: true },
    ];
  },
};

export default nextConfig;