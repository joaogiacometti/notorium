import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/components/ui/**",
        "src/db/**",
        "src/api/**",
        "src/app/**",
        "src/env.ts",
      ],
      // Floors set ~5pts below the measured baseline (2026-06): they guard
      // against regression, not to force a coverage sprint. Ratchet up as
      // coverage improves; never lower to make a red build pass.
      thresholds: {
        statements: 47,
        branches: 43,
        functions: 44,
        lines: 47,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only.ts"),
    },
  },
});
