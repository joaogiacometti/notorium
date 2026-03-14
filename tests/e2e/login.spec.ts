import { expect, test } from "@playwright/test";
import { clearUserSessions, ensureE2EUser } from "./support/db";

test("approved user can log in", async ({ page }) => {
  const user = await ensureE2EUser("approved");

  await page.goto("/en/login");
  await page.locator("#form-login-email").fill(user.email);
  await page.locator("#form-login-password").fill(user.password);
  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL("**/en/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toBeVisible();
});

test("pending user cannot log in", async ({ page }) => {
  const user = await ensureE2EUser("pending");
  await clearUserSessions(user.userId);

  await page.goto("/en/login");
  await page.locator("#form-login-email").fill(user.email);
  await page.locator("#form-login-password").fill(user.password);
  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL("**/en/login");
  await expect(
    page.getByText("Your account is pending approval."),
  ).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toHaveCount(0);
});

test("blocked user cannot log in", async ({ page }) => {
  const user = await ensureE2EUser("blocked");
  await clearUserSessions(user.userId);

  await page.goto("/en/login");
  await page.locator("#form-login-email").fill(user.email);
  await page.locator("#form-login-password").fill(user.password);
  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL("**/en/login");
  await expect(page.getByText("Your account access is blocked.")).toBeVisible();
  await expect(page.getByTestId("account-menu-trigger")).toHaveCount(0);
});
