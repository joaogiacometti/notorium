import { expect, test } from "@playwright/test";
import { getPrefixedEmail } from "./support/data";
import {
  getUserAccessSnapshotByEmail,
  resetE2EInstanceAuthState,
} from "./support/db";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const firstUser = {
  email: getPrefixedEmail(`bootstrap-first-${runId}`),
  name: "Bootstrap First User",
  password: "bootstrap-pass-1",
};

const secondUser = {
  email: getPrefixedEmail(`bootstrap-second-${runId}`),
  name: "Bootstrap Second User",
  password: "bootstrap-pass-2",
};

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

test.beforeAll(async () => {
  await resetE2EInstanceAuthState();
});

test.afterAll(async () => {
  await resetE2EInstanceAuthState();
});

test("first signup becomes approved admin immediately", async ({ page }) => {
  await page.goto("/signup");
  await page.locator("#form-signup-name").fill(firstUser.name);
  await page.locator("#form-signup-email").fill(firstUser.email);
  await page.locator("#form-signup-password").fill(firstUser.password);
  await page.locator("#form-signup-confirm-password").fill(firstUser.password);
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.waitForURL("**/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toBeVisible();
  await expect(page.getByTestId("theme-switcher-navbar-trigger")).toBeVisible();
  await expect(page.getByTestId("theme-switcher-floating-trigger")).toHaveCount(
    0,
  );

  const snapshot = await getUserAccessSnapshotByEmail(firstUser.email);

  expect(snapshot).toMatchObject({
    accessStatus: "approved",
    isAdmin: true,
  });
});

test("later signup stays pending and shows approval notice", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.locator("#form-signup-name").fill(secondUser.name);
  await page.locator("#form-signup-email").fill(secondUser.email);
  await page.locator("#form-signup-password").fill(secondUser.password);
  await page.locator("#form-signup-confirm-password").fill(secondUser.password);
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(
    page.getByRole("heading", { name: "Login to your account", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/waiting for administrator approval/i),
  ).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toHaveCount(0);
  await expect(
    page.getByTestId("theme-switcher-floating-trigger"),
  ).toBeVisible();
  await expect(page.getByTestId("theme-switcher-navbar-trigger")).toHaveCount(
    0,
  );

  const snapshot = await getUserAccessSnapshotByEmail(secondUser.email);

  expect(snapshot).toMatchObject({
    accessStatus: "pending",
    isAdmin: false,
  });
});
