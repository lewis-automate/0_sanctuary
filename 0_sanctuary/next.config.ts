import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // No 'output: "export"' — use default server/Node runtime for Vercel.
};

export default nextConfig;