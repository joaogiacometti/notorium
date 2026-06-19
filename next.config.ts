import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: [
    "@open-spaced-repetition/binding",
    "@vercel/blob",
    "pg",
    "sharp",
  ],
  // sharp's native addon loads libvips (libvips-cpp.so.*) from a sibling
  // @img/sharp-libvips-* package via a runtime dlopen/RPATH that Next's file
  // tracer can't follow statically. Without these the .so is dropped from the
  // Vercel function, causing ERR_DLOPEN_FAILED at runtime. Vercel Functions run
  // linux-x64 (glibc), so only those two packages need force-including.
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
};

export default nextConfig;
