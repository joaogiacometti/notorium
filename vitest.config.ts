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
      // Ratchet floors: set to the measured baseline (2026-06). Raise these
      // when coverage improves; never lower to make a red build pass.
      // Integer granularity avoids false failures from run-to-run variance.
      thresholds: {
        statements: 52,
        branches: 49,
        functions: 49,
        lines: 52,
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