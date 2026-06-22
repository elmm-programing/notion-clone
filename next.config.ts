import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a minimal standalone server bundle for the Docker image.
  output: "standalone",
};

export default nextConfig;
