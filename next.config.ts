import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["@open-spaced-repetition/binding", "pg"],
};

export default nextConfig;
