import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";
import {
  deleteFixtureBlobs,
  writeFixtureBlob,
} from "@/lib/media-storage/fixture-blob-store";
import { test as authenticatedTest } from "./authenticated-test";
import { runWithCleanup } from "./cleanup";
import {
  clearUserSubjectsByNames,
  type E2EUserAccount,
  ensureE2EUserAccount,
} from "./db";
import { seedIsolationData } from "./isolation-data";

interface IsolationAccount {
  user: E2EUserAccount;
  page: Page;
  data: Awaited<ReturnType<typeof seedIsolationData>>;
}

interface IsolationFixture {
  term: string;
  accounts: [IsolationAccount, IsolationAccount];
}

export const test = authenticatedTest.extend<{ isolation: IsolationFixture }>({
  isolation: async ({ browser, page, e2eUser, baseURL }, use) => {
    await runWithCleanup(async (registerCleanup) => {
      const term = `isolation-${randomUUID()}`;
      const otherUser = await ensureE2EUserAccount(
        {
          email: `${term}@example.com`,
          name: "Isolation second user",
          password: randomUUID(),
        },
        "approved",
      );
      registerCleanup(async () => {
        await getDb().delete(user).where(eq(user.id, otherUser.userId));
      });
      const otherContext = await browser.newContext({
        baseURL,
        storageState: { cookies: [], origins: [] },
      });
      registerCleanup(() => otherContext.close());
      const otherPage = await otherContext.newPage();
      await otherPage.goto("/login");
      await otherPage.locator("#form-login-email").fill(otherUser.email);
      await otherPage.locator("#form-login-password").fill(otherUser.password);
      await otherPage.getByRole("button", { name: "Sign in" }).click();
      await otherPage.waitForURL((url) => url.pathname === "/");

      const accounts: IsolationAccount[] = [];
      for (const [index, account] of [e2eUser, otherUser].entries()) {
        const name = `${term}-${index}`;
        registerCleanup(() =>
          clearUserSubjectsByNames(account.userId, [
            name,
            `${name} destination`,
          ]),
        );
        const data = await seedIsolationData(account.userId, name);
        const fixtureDir =
          process.env.NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR ??
          "test-results/media-storage-fixture";
        registerCleanup(() =>
          deleteFixtureBlobs(
            fixtureDir,
            data.media.map((blob) => blob.pathname),
          ),
        );
        for (const blob of data.media) {
          await writeFixtureBlob(
            fixtureDir,
            blob.pathname,
            blob.bytes,
            blob.contentType,
          );
        }
        accounts.push({
          user: account,
          page: index === 0 ? page : otherPage,
          data,
        });
      }
      await use({ term, accounts: [accounts[0], accounts[1]] });
    });
  },
});

export { expect } from "@playwright/test";
