import type { Page } from "@playwright/test";

export async function submitLogin(
  page: Page,
  credentials: {
    email: string;
    password: string;
  },
) {
  await page.locator("#form-login-email").fill(credentials.email);
  await page.locator("#form-login-password").fill(credentials.password);
  await page.locator('button[type="submit"]').click();
}

export async function submitSignup(
  page: Page,
  profile: {
    name: string;
    email: string;
    password: string;
  },
) {
  await page.locator("#form-signup-name").fill(profile.name);
  await page.locator("#form-signup-email").fill(profile.email);
  await page.locator("#form-signup-password").fill(profile.password);
  await page.locator("#form-signup-confirm-password").fill(profile.password);
  await page.locator('button[type="submit"]').click();
}
