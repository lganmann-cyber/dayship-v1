import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'node-html-parser',
    '@anthropic-ai/sdk',
    'jszip',
  ],
};

export default nextConfig;
