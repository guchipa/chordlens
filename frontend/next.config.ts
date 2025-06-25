import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/chordlens',
  images: {
    unoptimized: true,
  },

  compiler: {
    styledComponents: false,
    emotion: false,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.module.rules.push({
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader', 
        ],
      });
    }
    return config;
  },
};

export default nextConfig;
