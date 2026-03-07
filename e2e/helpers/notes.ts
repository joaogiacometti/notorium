import type { Locator, Page } from "@playwright/test";

function firstNoteActionsButton(page: Page): Locator {
  return page.getByLabel("Open note actions").first();
}

export async function openSubject(page: Page, subjectName: string) {
  await page.getByRole("link", { name: subjectName }).first().click();
}

export async function createNote(
  page: Page,
  data: {
    title: string;
    content: string;
  },
) {
  await page.locator("#btn-create-note").click();
  await page.locator("#form-create-note-title").fill(data.title);
  await page.locator("#form-create-note-content").fill(data.content);
  await page.getByRole("button", { name: "Create Note" }).click();
}

export async function openNote(page: Page, title: string) {
  await page.getByRole("link", { name: title }).first().click();
}

export async function editFirstNote(
  page: Page,
  data: {
    title: string;
    content: string;
  },
) {
  await firstNoteActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.locator("#form-edit-note-title").fill(data.title);
  await page.locator("#form-edit-note-content").fill(data.content);
  await page.getByRole("button", { name: "Save Changes" }).click();
}

export async function deleteFirstNote(page: Page) {
  await firstNoteActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
}
