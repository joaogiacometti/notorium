import { expect, test } from "@playwright/test";
import { submitLogin } from "../../helpers/auth";
import { e2eUser } from "../../helpers/constants";

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": "10.0.0.3",
  },
});

test.describe("login", () => {
  test("allows approved user login", async ({ page }) => {
    await page.goto("/en/login");

    await submitLogin(page, {
      email: e2eUser.email,
      password: e2eUser.password,
    });

    await expect(page).toHaveURL(/\/en(?:\/subjects)?(?:\/)?$/);
  });
});
