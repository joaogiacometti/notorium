import { expect, test } from "@playwright/test";
import {
  e2eNotesStorageStatePath,
  e2eNotesUser,
  e2eSubjectNames,
} from "../../helpers/constants";
import { clearE2ESubjects, closeE2EDb } from "../../helpers/db";
import { createNote, openNote, openSubject } from "../../helpers/notes";
import { createSubject } from "../../helpers/subjects";

test.describe("notes", () => {
  test.use({ storageState: e2eNotesStorageStatePath });

  test.afterAll(async () => {
    await closeE2EDb();
  });

  test.beforeEach(async () => {
    await clearE2ESubjects(e2eNotesUser.email);
  });

  test("creates, views, edits, and deletes a note", async ({ page }) => {
    const createdTitle = "E2E Note Created";
    const createdContent = "E2E note content created";
    const updatedTitle = "E2E Note Updated";
    const updatedContent = "E2E note content updated";

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: e2eSubjectNames.created,
      description: "Subject for notes lifecycle",
    });

    await openSubject(page, e2eSubjectNames.created);

    await createNote(page, {
      title: createdTitle,
      content: createdContent,
    });

    await expect(page.getByText(createdTitle)).toBeVisible();

    await openNote(page, createdTitle);

    await expect(page).toHaveURL(/\/en\/subjects\/[^/]+\/notes\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: createdTitle, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(createdContent)).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("#form-edit-note-title").fill(updatedTitle);
    await page.locator("#form-edit-note-content").fill(updatedContent);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(
      page.getByRole("heading", { name: updatedTitle, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(updatedContent)).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: updatedTitle, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(updatedContent)).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page).toHaveURL(/\/en\/subjects\/[^/]+$/);
    await expect(page.getByText(updatedTitle)).toHaveCount(0);
    await expect(page.getByText("No notes yet")).toBeVisible();
  });
});
