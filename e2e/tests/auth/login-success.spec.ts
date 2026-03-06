import { expect, test } from "@playwright/test";
import { submitLogin } from "../../helpers/auth";
import { e2eAuthUser } from "../../helpers/constants";
import { closeE2EDb, setE2EUserAccessStatus } from "../../helpers/db";

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": "10.0.0.3",
  },
});

test.describe("login", () => {
  test.beforeEach(async () => {
    await setE2EUserAccessStatus(e2eAuthUser.email, "approved");
  });

  test.afterAll(async () => {
    await closeE2EDb();
  });

  test("allows approved user login", async ({ page }) => {
    await page.goto("/en/login");

    await submitLogin(page, {
      email: e2eAuthUser.email,
      password: e2eAuthUser.password,
    });

    await expect(page).toHaveURL(/\/en(?:\/subjects)?(?:\/)?$/);

    await page.goto("/en/subjects");
    await expect(page.locator("#btn-create-subject")).toBeVisible();

    await page.reload();
    await expect(page.locator("#btn-create-subject")).toBeVisible();
  });

  test("blocks login for pending users", async ({ page }) => {
    await setE2EUserAccessStatus(e2eAuthUser.email, "pending");

    await page.goto("/en/login");
    await submitLogin(page, {
      email: e2eAuthUser.email,
      password: e2eAuthUser.password,
    });

    await expect(
      page.getByText("Your account is pending approval."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test("blocks login for blocked users", async ({ page }) => {
    await setE2EUserAccessStatus(e2eAuthUser.email, "blocked");

    await page.goto("/en/login");
    await submitLogin(page, {
      email: e2eAuthUser.email,
      password: e2eAuthUser.password,
    });

    await expect(
      page.getByText("Your account access is blocked."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/en\/login$/);
  });
});
