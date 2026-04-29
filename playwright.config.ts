import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://127.0.0.1:3001";
const emailFixtureInboxPath = "test-results/email-fixture-inbox.jsonl";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
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
    env: {
      NOTORIUM_AI_FIXTURE_MODE: "playwright",
      NOTORIUM_EMAIL_FIXTURE_MODE: "playwright",
      NOTORIUM_EMAIL_FIXTURE_INBOX_PATH: emailFixtureInboxPath,
      OPENROUTER_API_KEY: "playwright-openrouter-key",
      OPENROUTER_MODEL: "playwright-openrouter-model",
      RESEND_API_KEY: "playwright-resend-key",
      RESEND_FROM_EMAIL: "Notorium <notifications@example.com>",
    },
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
      testMatch: /(login|password-reset)\.spec\.ts/,
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
