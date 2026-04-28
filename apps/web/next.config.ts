import type { NextConfig } from "next";

import path from "path";

const workspaceRoot = path.join(process.cwd(), "../../");

const nextConfig: NextConfig = {
  output: "standalone",
  // Next.js 16 requires outputFileTracingRoot and turbopack.root to match
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: ["@seosh/db", "@seosh/shared"],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
