import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      // Library PDF uploads travel base64-encoded through a Server Action.
      // 20MB max book * ~1.37 base64 overhead needs headroom above the prior 8mb.
      bodySizeLimit: "30mb",
    },
  },
  serverExternalPackages: [
    "@open-spaced-repetition/binding",
    "@vercel/blob",
    "pg",
  ],
};

export default nextConfig;
