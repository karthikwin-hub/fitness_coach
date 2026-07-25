import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle for Oracle VM deploy (see deploy/deploy-app.ps1)
  output: "standalone",
};

export default nextConfig;
