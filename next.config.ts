import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Must be false to prevent WebGL context being destroyed by React double-mount
};

export default nextConfig;
