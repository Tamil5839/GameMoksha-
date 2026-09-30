import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The share-card route reads its fonts from disk at runtime.
  outputFileTracingIncludes: {
    "/share/[seasonId]/[format]": ["./src/assets/fonts/**/*"],
  },
};

export default nextConfig;
