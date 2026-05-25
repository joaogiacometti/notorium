import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  serverExternalPackages: [
    "@open-spaced-repetition/binding",
    "@vercel/blob",
    "pg",
  ],
};

export default nextConfig;
