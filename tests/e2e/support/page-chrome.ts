import type { Locator, Page } from "@playwright/test";

/**
 * Locates the current page indicator in the top-bar breadcrumb trail.
 *
 * After the layout refactor page titles render as the final breadcrumb crumb
 * (`<span aria-current="page">`) instead of an `<h1>`. The match is scoped to
 * `nav[aria-label="Breadcrumb"]` because the left section nav and the subject
 * sidebar tree also mark their active link with `aria-current="page"`, so an
 * unscoped selector would resolve to several elements and trip strict mode.
 *
 * @example
 * await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
 */
export function breadcrumbCurrent(page: Page, label: string): Locator {
  const escapedLabel = label.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

  return page
    .locator('nav[aria-label="Breadcrumb"] [aria-current="page"] span')
    .filter({ hasText: new RegExp(`^${escapedLabel}$`) })
    .last();
}
