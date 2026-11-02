import type { NextConfig } from "next";

// Deployment trigger: 2026-11-02 — verify Vercel builds after root directory fix.
const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@bamora/ui", "@bamora/platform", "@bamora/merchant", "@bamora/admin"],
};

export default nextConfig;