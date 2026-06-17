import { expect, type Page, test } from "@playwright/test";
import { getPrefixedEmail, getPrefixedValue } from "./support/data";
import { clearUserSessions, ensureE2EUserAccount } from "./support/db";
import {
  clearFixtureEmails,
  extractResetUrl,
  readFixtureEmailsForRecipient,
} from "./support/email-fixture";

test.describe.configure({ mode: "serial" });

function getUniqueEmail(testTitle: string) {
  return getPrefixedEmail(getPrefixedValue("password-reset", testTitle));
}

async function requestPasswordReset(page: Page, email: string) {
  await page.goto("/forgot-password");
  await expect(
    page.getByRole("heading", { name: "Forgot your password?", exact: true }),
  ).toBeVisible();
  await page.locator("#form-forgot-password-email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await page.waitForURL("**/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to Notorium", exact: true }),
  ).toBeVisible();
}

async function loginWithPassword(page: Page, email: string, password: string) {
  await page.locator("#form-login-email").fill(email);
  await page.locator("#form-login-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("approved user can reset password through app email flow", async ({
  page,
}) => {
  const credentials = {
    email: getUniqueEmail("approved"),
    name: "E2E password reset approved user",
    password: "old-password-12345",
  };
  const newPassword = "new-password-12345";

  const user = await ensureE2EUserAccount(credentials, "approved");
  await clearUserSessions(user.userId);
  await clearFixtureEmails();

  await requestPasswordReset(page, credentials.email);

  const emails = await readFixtureEmailsForRecipient(credentials.email);
  expect(emails).toHaveLength(1);
  expect(emails[0]?.subject).toBe("Reset your Notorium password");

  await page.goto(extractResetUrl(emails[0]));
  await expect(
    page.getByRole("heading", { name: "Set a new password", exact: true }),
  ).toBeVisible();
  await page.locator("#form-reset-password-password").fill(newPassword);
  await page.locator("#form-reset-password-confirm-password").fill(newPassword);
  await page.getByRole("button", { name: "Reset password" }).click();
  await page.waitForURL("**/login");

  await loginWithPassword(page, credentials.email, credentials.password);
  await expect(
    page.getByRole("heading", { name: "Sign in to Notorium", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Login failed.")).toBeVisible();

  await loginWithPassword(page, credentials.email, newPassword);
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByTestId("home-greeting")).toBeVisible();
});

test("inactive and missing accounts get generic reset response without email", async ({
  page,
}) => {
  const pendingUser = await ensureE2EUserAccount(
    {
      email: getUniqueEmail("pending"),
      name: "E2E password reset pending user",
      password: "pending-password-12345",
    },
    "pending",
  );
  const blockedUser = await ensureE2EUserAccount(
    {
      email: getUniqueEmail("blocked"),
      name: "E2E password reset blocked user",
      password: "blocked-password-12345",
    },
    "blocked",
  );
  const missingEmail = getUniqueEmail("missing");
  const hiddenRecipients = [pendingUser.email, blockedUser.email, missingEmail];

  await clearFixtureEmails();

  for (const email of hiddenRecipients) {
    await requestPasswordReset(page, email);
  }

  for (const email of hiddenRecipients) {
    await expect
      .poll(async () => readFixtureEmailsForRecipient(email))
      .toHaveLength(0);
  }
});
