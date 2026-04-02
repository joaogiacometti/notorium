import { mkdir } from "node:fs/promises";
import { test as base } from "@playwright/test";
import {
  clearUserSessions,
  type E2EUserAccount,
  ensureApprovedE2EWorkerUser,
} from "./db";

interface AuthenticatedFixtures {
  e2eUser: E2EUserAccount;
}

interface AuthenticatedWorkerFixtures {
  workerStorageStatePath: string;
  workerE2EUser: E2EUserAccount;
}

function getE2EBaseUrl() {
  return (
    process.env.PLAYWRIGHT_BASE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

export const test = base.extend<
  AuthenticatedFixtures,
  AuthenticatedWorkerFixtures
>({
  workerE2EUser: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructuring syntax
    async ({}, use, workerInfo) => {
      const user = await ensureApprovedE2EWorkerUser(workerInfo.workerIndex);
      await clearUserSessions(user.userId);
      await use(user);
    },
    { scope: "worker" },
  ],
  workerStorageStatePath: [
    async ({ browser, workerE2EUser }, use, workerInfo) => {
      await mkdir("playwright/.auth", { recursive: true });
      const storageStatePath = `playwright/.auth/${workerInfo.project.name}-worker-${workerInfo.workerIndex}.json`;
      const loginUrl = new URL("/login", getE2EBaseUrl()).toString();

      const page = await browser.newPage();
      await page.goto(loginUrl);
      await page.locator("#form-login-email").fill(workerE2EUser.email);
      await page.locator("#form-login-password").fill(workerE2EUser.password);
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForURL("**/subjects");
      await page.context().storageState({ path: storageStatePath });
      await page.context().close();

      await use(storageStatePath);
    },
    { scope: "worker" },
  ],
  storageState: ({ workerStorageStatePath }, use) =>
    use(workerStorageStatePath),
  e2eUser: ({ workerE2EUser }, use) => use(workerE2EUser),
});

export { expect } from "@playwright/test";
