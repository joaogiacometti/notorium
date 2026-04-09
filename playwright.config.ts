import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://127.0.0.1:3001";

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
    command:
      "bun --env-file=.env.test run build && bun --env-file=.env.test run start -- --hostname 127.0.0.1 --port 3001",
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
      testMatch:
        /(subjects|attendance|notes|assessments|flashcards|decks)\.spec\.ts/,
      dependencies: ["bootstrap"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
