import { expect, type Page, test } from "@playwright/test";
import {
  clearUserSubjectsByNames,
  createMaxNotesForSubject,
  createNote,
  createSubject,
  ensureApprovedE2EUser,
} from "./support/db";

function getUniqueSubjectName(testTitle: string) {
  return `E2E Notes ${testTitle} ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getUniqueNoteTitle(testTitle: string) {
  return `E2E Note ${testTitle} ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function openSubjectDetailByName(page: Page, subjectName: string) {
  await page.goto("/en/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  const subjectCard = page
    .getByTestId("subject-card")
    .filter({ hasText: subjectName })
    .first();

  await expect(subjectCard).toBeVisible();
  await subjectCard.getByTestId("subject-card-link").click();
  await expect(page.getByRole("heading", { name: subjectName })).toBeVisible();
}

async function createNoteFromDialog(
  page: Page,
  title: string,
  content: string,
) {
  await page.locator("#btn-create-note").click();
  const createDialog = page.getByRole("dialog", { name: "Create Note" });
  await createDialog.locator("#form-create-note-title").fill(title);
  await createDialog.locator("#form-create-note-content").fill(content);
  await createDialog.getByRole("button", { name: "Create Note" }).click();
  await expect(createDialog).toHaveCount(0);
}

async function openNoteDetailByTitle(page: Page, noteTitle: string) {
  await page
    .getByRole("link", { name: noteTitle, exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: noteTitle, exact: true }),
  ).toBeVisible();
}

test("can create and open a note", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("create-open");
  const noteTitle = getUniqueNoteTitle("create-open");
  const noteContent = "Cell membranes regulate transport and communication.";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    await createSubject(user.userId, subjectName, "Notes smoke test");
    await openSubjectDetailByName(page, subjectName);

    await createNoteFromDialog(page, noteTitle, noteContent);

    await openNoteDetailByTitle(page, noteTitle);
    await expect(page.getByText(noteContent)).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can edit a note", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("edit");
  const initialTitle = getUniqueNoteTitle("edit-initial");
  const updatedTitle = getUniqueNoteTitle("edit-updated");
  const updatedContent = "Updated content for note edit validation.";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Notes edit smoke test",
    );

    await createNote(user.userId, createdSubject.id, initialTitle, "Initial");

    await openSubjectDetailByName(page, subjectName);
    await openNoteDetailByTitle(page, initialTitle);

    await page
      .getByRole("main")
      .getByRole("button", { name: "Edit", exact: true })
      .click();

    const editDialog = page.getByRole("dialog", { name: "Edit Note" });
    await editDialog.locator("#form-edit-note-title").fill(updatedTitle);
    await editDialog.locator("#form-edit-note-content").fill(updatedContent);
    await editDialog.getByRole("button", { name: "Save Changes" }).click();

    await expect(editDialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: updatedTitle, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(updatedContent)).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can delete a note", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("delete");
  const noteTitle = getUniqueNoteTitle("delete");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Notes delete smoke test",
    );

    await createNote(
      user.userId,
      createdSubject.id,
      noteTitle,
      "Delete from detail page",
    );

    await openSubjectDetailByName(page, subjectName);
    await openNoteDetailByTitle(page, noteTitle);

    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete Note" });
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: subjectName, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: noteTitle, exact: true }),
    ).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("disables creating notes when limit is reached", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("limit");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Notes limit smoke test",
    );

    await createMaxNotesForSubject(user.userId, createdSubject.id);

    await openSubjectDetailByName(page, subjectName);

    await expect(page.locator("#btn-create-note")).toBeDisabled();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
