import { defineConfig } from "@playwright/test";
import { e2eSubjectsStorageStatePath } from "./e2e/helpers/constants";

const port = process.env.PORT ?? "3000";
const playwrightBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = playwrightBaseURL ?? `http://localhost:${port}`;
const authRateLimitPrefix =
  process.env.E2E_AUTH_RATE_LIMIT_PREFIX ?? `ratelimit:auth:e2e:${Date.now()}`;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup-auth-session",
      testMatch: /.*\/setup\/auth\.setup\.ts/,
    },
    {
      name: "auth",
      dependencies: ["setup-auth-session"],
      testMatch: /.*\/auth\/.*\.spec\.ts/,
    },
    {
      name: "subjects",
      dependencies: ["setup-auth-session"],
      testMatch: /.*\/subjects\/.*\.spec\.ts/,
      use: {
        storageState: e2eSubjectsStorageStatePath,
      },
    },
  ],
  webServer: playwrightBaseURL
    ? undefined
    : {
        command: "bun dev",
        url: `${baseURL}/en/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PORT: String(port),
          BETTER_AUTH_URL: baseURL,
          BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
          DATABASE_URL: process.env.DATABASE_URL ?? "",
          REDIS_URL: process.env.REDIS_URL ?? "",
          AUTH_RATE_LIMIT_MAX_ATTEMPTS:
            process.env.E2E_AUTH_RATE_LIMIT_MAX_ATTEMPTS ?? "3",
          AUTH_RATE_LIMIT_WINDOW_SECONDS:
            process.env.E2E_AUTH_RATE_LIMIT_WINDOW_SECONDS ?? "60",
          AUTH_RATE_LIMIT_PREFIX: authRateLimitPrefix,
        },
      },
});
