import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/chordlens',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
