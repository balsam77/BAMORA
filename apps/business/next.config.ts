import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@bamora/ui", "@bamora/platform", "@bamora/merchant", "@bamora/admin"],
};

export default nextConfig;