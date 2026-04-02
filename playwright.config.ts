import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

if (process.env.E2E_ALLOW_DESTRUCTIVE_RESET !== "true") {
  throw new Error(
    "Refusing to start Playwright E2E tests. Set E2E_ALLOW_DESTRUCTIVE_RESET=true to run e2e safely.",
  );
}

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "bunx next dev --hostname 127.0.0.1 --port 3000",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "bootstrap",
      testMatch: /signup-bootstrap\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "public",
      testMatch: /login\.spec\.ts/,
      dependencies: ["bootstrap"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "authenticated",
      testMatch: /(subjects|attendance|notes|assessments|flashcards)\.spec\.ts/,
      dependencies: ["bootstrap"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
