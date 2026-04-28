import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Moved from experimental as per Next.js 16 warnings
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ["@seosh/db", "@seosh/shared"],
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    root: path.join(process.cwd(), "../../"),
  },
};

export default nextConfig;
