import { expect, test } from "@playwright/test";
import { submitLogin } from "../../helpers/auth";

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": "10.0.0.2",
  },
});

test.describe("login rate limit", () => {
  test("blocks requests after configured threshold", async ({ page }) => {
    const credentials = {
      email: `e2e-${Date.now()}@example.com`,
      password: "wrong-password",
    };

    await page.goto("/en/login");

    await submitLogin(page, credentials);
    await expect(page.getByText("Login failed.")).toBeVisible();

    let rateLimited = false;
    for (let index = 0; index < 12; index += 1) {
      await submitLogin(page, credentials);
      rateLimited = await page
        .getByText("Too many attempts. Please try again later.")
        .isVisible({ timeout: 1200 })
        .catch(() => false);

      if (rateLimited) {
        break;
      }
    }

    expect(rateLimited).toBe(true);
  });
});
