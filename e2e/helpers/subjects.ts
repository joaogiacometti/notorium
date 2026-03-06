import type { Locator, Page } from "@playwright/test";

function firstSubjectActionsButton(page: Page): Locator {
  return page.getByLabel("Open subject actions").first();
}

export async function createSubject(
  page: Page,
  data: {
    name: string;
    description: string;
  },
) {
  await page.locator("#btn-create-subject").click();
  await page.locator("#form-create-subject-name").fill(data.name);
  await page.locator("#form-create-subject-description").fill(data.description);
  await page.getByRole("button", { name: "Create Subject" }).click();
}

export async function editFirstSubject(
  page: Page,
  data: {
    name: string;
    description: string;
  },
) {
  await firstSubjectActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.locator("#form-edit-subject-name").fill(data.name);
  await page.locator("#form-edit-subject-description").fill(data.description);
  await page.getByRole("button", { name: "Save Changes" }).click();
}

export async function archiveFirstSubject(page: Page) {
  await firstSubjectActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Archive" }).click();
}

export async function deleteFirstSubject(page: Page) {
  await firstSubjectActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
}
