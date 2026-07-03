import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA service worker + offline caching are added in a later chunk (via serwist).
  // Keep config minimal until then.
  reactStrictMode: true,
};

export default nextConfig;
