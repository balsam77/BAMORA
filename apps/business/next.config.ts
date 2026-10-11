import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@bamora/ui", "@bamora/platform"],
};

export default nextConfig;