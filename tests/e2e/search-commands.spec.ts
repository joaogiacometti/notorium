import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";

const SEARCH_PLACEHOLDER =
  "Search notes, PDFs, and flashcards, or run a command...";

async function openSearchDialog(page: Page) {
  await page.keyboard.press("ControlOrMeta+k");
  await expect(
    page.getByRole("dialog", { name: "Search and Commands" }),
  ).toBeVisible();
}

test("opens with Ctrl/Cmd+K and navigates to a section", async ({ page }) => {
  await page.goto("/");

  await openSearchDialog(page);
  await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill("flashcards");
  await page.getByRole("option", { name: "Go to Flashcards" }).click();

  await page.waitForURL("**/flashcards");
});

test("runs the create subject command from the dialog", async ({ page }) => {
  await page.goto("/");

  await openSearchDialog(page);
  await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill("subject");
  await page.getByRole("option", { name: "Create Subject" }).click();

  await expect(
    page.getByRole("dialog", { name: "Create Subject" }),
  ).toBeVisible();
});
