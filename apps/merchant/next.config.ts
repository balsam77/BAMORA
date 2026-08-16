import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bamora/ui", "@bamora/platform"],
};

export default nextConfig;
