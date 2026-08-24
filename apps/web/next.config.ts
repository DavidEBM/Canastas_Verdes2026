import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  transpilePackages: [
    "@canastas-verdes-2026/shared",
    "@canastas-verdes-2026/firebase-admin",
  ],
};

export default nextConfig;