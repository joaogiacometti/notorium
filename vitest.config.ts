import path from "node:path";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
        plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
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
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only.ts"),
    },
  },
});
