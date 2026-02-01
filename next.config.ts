import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable React Strict Mode
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
