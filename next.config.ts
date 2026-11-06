import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { getServerEnv } from "./src/env";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // AGENTS.md is hand-maintained; stop `next dev` from appending its own rules block.
  agentRules: false,
  turbopack: {
    root: __dirname,
  },
  // Folders organize the sidebar; documents have their own pages.
  async redirects() {
    return [{ source: "/folders/:id", destination: "/", permanent: false }];
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

export default function config(phase: string): NextConfig {
  // Env validation is otherwise lazy, so a deploy missing a required variable
  // would succeed and then fail every request. Failing the build keeps the
  // previous deployment serving.
  if (phase === PHASE_PRODUCTION_BUILD) {
    getServerEnv();
  }

  return nextConfig;
}
