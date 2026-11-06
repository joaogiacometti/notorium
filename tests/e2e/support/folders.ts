import type { Locator, Page } from "@playwright/test";
import { expect } from "./authenticated-test";

/**
 * Opens Home and waits for a folder's row in the left-menu tree. Folders are
 * folders with no page of their own, so tests reach their documents through
 * the tree.
 */
export async function openFolderInSidebar(page: Page, folderName: string) {
  await page.goto("/");

  await expect(getFolderSidebarRow(page, folderName)).toBeVisible();
}

/** Locates a folder row inside the left-menu folder tree by its name. */
export function getFolderSidebarRow(page: Page, folderName: string): Locator {
  return page.locator(
    `nav[aria-label="Folders"] [data-folder-name=${JSON.stringify(folderName)}]`,
  );
}

/** Expands a folder row in the left-menu tree so its documents are loaded. */
export async function expandFolderSidebarRow(page: Page, folderName: string) {
  const row = getFolderSidebarRow(page, folderName);
  await expect(row).toBeVisible();

  const expandButton = row.getByRole("button", {
    name: "Expand folder",
    exact: true,
  });

  if ((await expandButton.count()) === 0) {
    return;
  }

  await expandButton.click();
}

/**
 * Opens a folder's context menu from the left-menu folder tree. The kebab
 * button only reveals on row hover (`sm:group-hover`), so hover the enclosing
 * row first, then open the actions menu.
 */
export async function openFolderSidebarActions(page: Page, folderName: string) {
  const row = getFolderSidebarRow(page, folderName);
  await expect(row).toBeVisible();
  await row.hover();

  const actionsButton = row.getByRole("button", {
    name: `Actions for ${folderName}`,
    exact: true,
  });
  await expect(actionsButton).toBeVisible();
  await actionsButton.click();
}

/**
 * Runs an item from a folder's Documents submenu ("Add note", "Add PDF") in
 * the left-menu folder tree.
 */
export async function clickFolderDocumentsMenuItem(
  page: Page,
  folderName: string,
  itemName: string,
) {
  await openFolderSidebarActions(page, folderName);
  await page.getByRole("menuitem", { name: "Documents", exact: true }).click();
  await page.getByRole("menuitem", { name: itemName, exact: true }).click();
}
