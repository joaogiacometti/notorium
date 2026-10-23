import path from "node:path";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const domCompilerPlugins = [
  react(),
  babel({ presets: [reactCompilerPreset()] }),
];
const isolatedDomTests = [
  "src/components/assistant/**/*.test.tsx",
  "src/components/flashcards/dialogs/flashcard-editor-dialog-content.test.tsx",
  "src/components/flashcards/review/review-session-card-content.test.tsx",
  "src/components/account/delete-account-dialog.test.tsx",
  "src/components/navbar/logout-button.test.tsx",
];

export default defineConfig({
  test: {
    setupFiles: ["./src/test/jsdom-gap-fakes.ts"],
    // Only tests that need a DOM pay for jsdom: component tests get it by
    // extension, and a DOM-dependent `.test.ts` opts in with a
    // `// @vitest-environment jsdom` docblock.
    projects: [
      {
        extends: true,
        // Component tests compile with React Compiler like the Next.js build
        // (`reactCompiler: true`), so memoization bugs that only exist in
        // compiled output fail here instead of in production.
        plugins: domCompilerPlugins,
        test: {
          name: "dom",
          environment: "jsdom",
          // Reuse jsdom per worker while preserving per-file window isolation.
          pool: "vmThreads",
          include: ["src/**/*.test.tsx"],
          exclude: isolatedDomTests,
        },
      },
      {
        extends: true,
        plugins: domCompilerPlugins,
        test: {
          // These tests need Node streaming globals or replace window.location,
          // both of which are incompatible with the jsdom VM context.
          name: "dom-forks",
          environment: "jsdom",
          pool: "forks",
          include: isolatedDomTests,
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
    ],
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
    },
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
