import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // This helps resolve packages in monorepos
    outputFileTracingRoot: process.cwd(),
  },
};

export default nextConfig;
