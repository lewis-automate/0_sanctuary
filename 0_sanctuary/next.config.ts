import type { NextConfig } from "next";

const nextConfig = {
  reactCompiler: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  async redirects() {
    return [
      { source: "/add-vocab", destination: "/vocab?tab=review", permanent: true },
      { source: "/writer", destination: "/writing?tab=write-now", permanent: true },
      {
        source: "/writing/practice/:feedbackId",
        destination: "/writing?tab=thoughts",
        permanent: true,
      },
    ];
  },
} as NextConfig;

export default nextConfig;
