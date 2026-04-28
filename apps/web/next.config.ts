import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // This helps resolve packages in monorepos
    outputFileTracingRoot: process.cwd(),
  },
  // Transpile local workspace packages
  transpilePackages: ["@seosh/db", "@seosh/shared"],
  // Ignore lint and type errors during build (checked locally instead)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
