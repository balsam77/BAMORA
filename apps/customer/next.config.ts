
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@bamora/ui", "@bamora/platform"],
  env: {
    NEXT_PUBLIC_BAMORA_API_URL: process.env.NEXT_PUBLIC_BAMORA_API_URL ?? "http://127.0.0.1:4001",
  },
};

export default nextConfig;