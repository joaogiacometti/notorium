import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { breadcrumbCurrent } from "./support/page-chrome";

async function openCommandPalette(page: Page) {
  await page.keyboard.press("ControlOrMeta+p");
  await expect(
    page.getByRole("dialog", { name: "Command Palette" }),
  ).toBeVisible();
}

test("opens with Ctrl/Cmd+P and navigates to a section", async ({ page }) => {
  await page.goto("/flashcards");

  await openCommandPalette(page);
  await page.getByPlaceholder("Type a command or search...").fill("library");
  await page.getByRole("option", { name: "Go to Library" }).click();

  await page.waitForURL("**/library");
  await expect(breadcrumbCurrent(page, "Library")).toBeVisible();
});

test("runs the create subject command from the palette", async ({ page }) => {
  await page.goto("/");

  await openCommandPalette(page);
  await page.getByPlaceholder("Type a command or search...").fill("subject");
  await page.getByRole("option", { name: "Create Subject" }).click();

  await expect(
    page.getByRole("dialog", { name: "Create Subject" }),
  ).toBeVisible();
});
