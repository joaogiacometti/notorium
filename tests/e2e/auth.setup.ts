import { mkdir } from "node:fs/promises";
import { expect, test as setup } from "@playwright/test";
import { clearUserSessions, ensureApprovedE2EUser } from "./support/db";

setup("authenticate", async ({ page, context }) => {
  const user = await ensureApprovedE2EUser();
  await clearUserSessions(user.userId);
  await mkdir("playwright/.auth", { recursive: true });

  await page.goto("/en/login");
  await page.locator("#form-login-email").fill(user.email);
  await page.locator("#form-login-password").fill(user.password);
  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL("**/en/subjects");
  await expect(page.getByTestId("account-menu-trigger")).toBeVisible();

  await context.storageState({ path: "playwright/.auth/user.json" });
});
