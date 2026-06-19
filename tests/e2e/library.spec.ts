import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { breadcrumbCurrent } from "./support/page-chrome";

async function openLibraryPage(page: Page) {
  await page.goto("/library");
  await expect(breadcrumbCurrent(page, "Library")).toBeVisible();
}

async function openCommandPalette(page: Page) {
  await page.keyboard.press("ControlOrMeta+p");
  await expect(
    page.getByRole("dialog", { name: "Command Palette" }),
  ).toBeVisible();
}

test("navigates to the library from the command palette", async ({ page }) => {
  await page.goto("/");

  await openCommandPalette(page);
  await page.getByPlaceholder("Type a command or search...").fill("library");
  await page.getByRole("option", { name: "Go to Library" }).click();

  await page.waitForURL("**/library");
  await expect(breadcrumbCurrent(page, "Library")).toBeVisible();
});

test("opens the add book dialog from the library page", async ({ page }) => {
  await openLibraryPage(page);

  await page.getByRole("button", { name: "Add book" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Add Book" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("PDF file")).toBeVisible();
  await expect(dialog.getByLabel("Title")).toBeVisible();
});

test("opens the add book dialog from the command palette", async ({ page }) => {
  await openLibraryPage(page);

  await openCommandPalette(page);
  await page.getByPlaceholder("Type a command or search...").fill("add book");
  await page.getByRole("option", { name: "Add Book" }).click();

  await expect(page.getByRole("dialog", { name: "Add Book" })).toBeVisible();
});

test("requires a PDF file before uploading", async ({ page }) => {
  await openLibraryPage(page);

  await page.getByRole("button", { name: "Add book" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add Book" });
  await dialog.getByLabel("Title").fill("A Book Without A File");
  await dialog.getByRole("button", { name: "Add Book" }).click();

  await expect(dialog.getByText("Select a PDF file to upload.")).toBeVisible();
});
