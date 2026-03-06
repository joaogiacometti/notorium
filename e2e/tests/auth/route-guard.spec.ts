import { expect, test } from "@playwright/test";

test.describe("route guard", () => {
  test("redirects unauthenticated users from subjects to login", async ({
    page,
  }) => {
    await page.goto("/en/subjects");
    await expect(page).toHaveURL(/\/en\/login$/);
  });
});
