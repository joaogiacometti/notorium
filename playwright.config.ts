import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://127.0.0.1:3001";
const emailFixtureInboxPath = "test-results/email-fixture-inbox.jsonl";
const bootstrapSpecs = /signup-bootstrap\.spec\.ts/;
const publicSpecs = /(login|password-reset)\.spec\.ts/;

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
      "npm run test:e2e:build && npm run test:e2e:start -- --hostname 127.0.0.1 --port 3001",
    env: {
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
      testMatch: bootstrapSpecs,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "public",
      testMatch: publicSpecs,
      dependencies: ["bootstrap"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "authenticated",
      // Every other spec runs signed in. An allow-list here silently skipped
      // newly added specs (search-commands.spec.ts never ran).
      testIgnore: [bootstrapSpecs, publicSpecs],
      dependencies: ["bootstrap"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
