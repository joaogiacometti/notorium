import { expect, test } from "@playwright/test";
import { clearUserSessions, ensureE2EUser } from "./support/db";

test("approved user can log in", async ({ page }) => {
  const user = await ensureE2EUser("approved");

  await page.goto("/login");
  await page.locator("#form-login-email").fill(user.email);
  await page.locator("#form-login-password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByTestId("home-greeting")).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toBeVisible();
  await expect(page.getByTestId("theme-switcher-navbar-trigger")).toBeVisible();
  await expect(page.getByTestId("theme-switcher-floating-trigger")).toHaveCount(
    0,
  );
});

test("pending user cannot log in", async ({ page }) => {
  const user = await ensureE2EUser("pending");
  await clearUserSessions(user.userId);

  await page.goto("/login");
  await page.locator("#form-login-email").fill(user.email);
  await page.locator("#form-login-password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("heading", { name: "Sign in to Notorium", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#form-login-email")).toBeVisible();
  await expect(page.locator("#form-login-password")).toBeVisible();
  await expect(page.getByText(/pending approval/i)).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toHaveCount(0);
  await expect(
    page.getByTestId("theme-switcher-floating-trigger"),
  ).toBeVisible();
  await expect(page.getByTestId("theme-switcher-navbar-trigger")).toHaveCount(
    0,
  );
});

test("blocked user cannot log in", async ({ page }) => {
  const user = await ensureE2EUser("blocked");
  await clearUserSessions(user.userId);

  await page.goto("/login");
  await page.locator("#form-login-email").fill(user.email);
  await page.locator("#form-login-password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("heading", { name: "Sign in to Notorium", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#form-login-email")).toBeVisible();
  await expect(page.locator("#form-login-password")).toBeVisible();
  await expect(page.getByText(/access is blocked/i)).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toHaveCount(0);
  await expect(
    page.getByTestId("theme-switcher-floating-trigger"),
  ).toBeVisible();
  await expect(page.getByTestId("theme-switcher-navbar-trigger")).toHaveCount(
    0,
  );
});
