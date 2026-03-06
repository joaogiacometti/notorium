import { expect, test } from "@playwright/test";
import { submitLogin, submitSignup } from "../../helpers/auth";
import { e2eStorageStatePath, e2eUser } from "../../helpers/constants";
import { approveE2EUser, closeE2EDb, resetE2EUser } from "../../helpers/db";

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": "10.0.0.1",
  },
});

test.afterAll(async () => {
  await closeE2EDb();
});

test("create approved e2e account and persist auth state", async ({ page }) => {
  await resetE2EUser();

  await page.goto("/en/signup");
  await submitSignup(page, e2eUser);
  await Promise.race([
    expect(page).toHaveURL(/\/en\/login$/),
    expect(page).toHaveURL(/\/en(?:\/)?$/),
  ]);

  await approveE2EUser();

  await page.goto("/en/subjects");

  if (new URL(page.url()).pathname === "/en/login") {
    await submitLogin(page, {
      email: e2eUser.email,
      password: e2eUser.password,
    });
    await expect(page).toHaveURL(/\/en(?:\/)?$/);
    await page.goto("/en/subjects");
  }

  await expect(page.locator("#btn-create-subject")).toBeVisible();

  const storageState = await page.context().storageState();
  expect(storageState.cookies.length).toBeGreaterThan(0);
  await page.context().storageState({ path: e2eStorageStatePath });
});
