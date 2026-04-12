import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
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
