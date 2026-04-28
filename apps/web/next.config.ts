import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Moved from experimental as per Next.js 16 warnings
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ["@seosh/db", "@seosh/shared"],
  typescript: { ignoreBuildErrors: true },
  // Fix Turbopack workspace root detection issue
  experimental: {
    turbo: {
      root: "../../",
    },
  },
};

export default nextConfig;
