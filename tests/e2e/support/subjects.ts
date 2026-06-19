import type { Locator, Page } from "@playwright/test";
import { expect } from "./authenticated-test";
import { breadcrumbCurrent } from "./page-chrome";

/**
 * Opens a subject's detail page by navigating directly to `/subjects/{id}`.
 * After the layout refactor the standalone `/subjects` listing page was removed
 * and subjects live in the left-menu tree, so tests create the subject via the
 * DB fixture and open it by its known id. Asserts the breadcrumb top bar shows
 * the subject name so callers can rely on the page being ready.
 */
export async function openSubjectDetailByName(
  page: Page,
  subjectName: string,
  subjectId: string,
) {
  await page.goto(`/subjects/${subjectId}`);

  await expect(breadcrumbCurrent(page, subjectName)).toBeVisible();
}

/** Locates a subject link inside the left-menu subject tree by its name. */
export function getSubjectSidebarLink(
  page: Page,
  subjectName: string,
): Locator {
  return page
    .locator('nav[aria-label="Subjects"]')
    .getByRole("link")
    .filter({ hasText: subjectName })
    .first();
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
  const subjectLink = getSubjectSidebarLink(page, subjectName);
  await expect(subjectLink).toBeVisible();

  const row = subjectLink.locator("xpath=ancestor::div[1]");
  await row.hover();

  const actionsButton = row.getByRole("button", {
    name: `Actions for ${subjectName}`,
    exact: true,
  });
  await expect(actionsButton).toBeVisible();
  await actionsButton.click();
}
