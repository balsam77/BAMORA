
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@bamora/ui", "@bamora/platform"],
};

export default nextConfig;