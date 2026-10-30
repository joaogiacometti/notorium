import type { Locator, Page } from "@playwright/test";
import { expect } from "./authenticated-test";

/**
 * Opens Home and waits for a subject's row in the left-menu tree. Subjects are
 * folders with no page of their own, so tests reach their documents through
 * the tree.
 */
export async function openSubjectInSidebar(page: Page, subjectName: string) {
  await page.goto("/");

  await expect(getSubjectSidebarRow(page, subjectName)).toBeVisible();
}

/** Locates a subject row inside the left-menu subject tree by its name. */
export function getSubjectSidebarRow(page: Page, subjectName: string): Locator {
  return page.locator(
    `nav[aria-label="Subjects"] [data-subject-name=${JSON.stringify(subjectName)}]`,
  );
}

/** Expands a subject row in the left-menu tree so its documents are loaded. */
export async function expandSubjectSidebarRow(page: Page, subjectName: string) {
  const row = getSubjectSidebarRow(page, subjectName);
  await expect(row).toBeVisible();

  const expandButton = row.getByRole("button", {
    name: "Expand subject",
    exact: true,
  });

  if ((await expandButton.count()) === 0) {
    return;
  }

  await expandButton.click();
}

/**
 * Opens a subject's context menu from the left-menu subject tree. The kebab
 * button only reveals on row hover (`sm:group-hover`), so hover the enclosing
 * row first, then open the actions menu.
 */
export async function openSubjectSidebarActions(
  page: Page,
  subjectName: string,
) {
  const row = getSubjectSidebarRow(page, subjectName);
  await expect(row).toBeVisible();
  await row.hover();

  const actionsButton = row.getByRole("button", {
    name: `Actions for ${subjectName}`,
    exact: true,
  });
  await expect(actionsButton).toBeVisible();
  await actionsButton.click();
}

/**
 * Runs an item from a subject's Documents submenu ("Add note", "Add PDF") in
 * the left-menu subject tree.
 */
export async function clickSubjectDocumentsMenuItem(
  page: Page,
  subjectName: string,
  itemName: string,
) {
  await openSubjectSidebarActions(page, subjectName);
  await page.getByRole("menuitem", { name: "Documents", exact: true }).click();
  await page.getByRole("menuitem", { name: itemName, exact: true }).click();
}
