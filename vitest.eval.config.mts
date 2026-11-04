import path from "node:path";
import { defineConfig } from "vitest/config";

// Separate from vitest.config.mts so `npm run test` never calls a paid model.
export default defineConfig({
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    setupFiles: ["./evals/setup.ts"],
    globalSetup: ["./evals/report-run.ts"],
    testTimeout: 90_000,
    // A retry pays for another reply and hides intermittent failures; trials
    // (EVAL_TRIALS) measure them instead.
    retry: 0,
    // Usage is attributed to a case by running one at a time within each file.
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(
        import.meta.dirname,
        "./src/test/server-only.ts",
      ),
    },
  },
});
