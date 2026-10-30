import type { Page } from "@playwright/test";
import {
  countFlashcardsBySubjectForUser,
  getFlashcardsManagePageForUser,
} from "@/features/flashcards/queries";
import { AssistantChatFixture } from "./support/assistant-chat-fixture";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjectsByNames,
  createNote,
  createSubject,
  getNoteById,
} from "./support/db";
import {
  clickSubjectDocumentsMenuItem,
  expandSubjectSidebarRow,
  openSubjectInSidebar,
} from "./support/subjects";

function escapeRegex(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("note-subject", testTitle);
}

function getUniqueNoteTitle(testTitle: string) {
  return getPrefixedValue("note", testTitle);
}

async function createNoteFromDialog(page: Page, title: string) {
  const createDialog = page.getByRole("dialog", { name: "Create Note" });
  await createDialog.locator("#form-create-note-title-input").fill(title);
  await createDialog.getByRole("button", { name: "Create Note" }).click();
  await expect(createDialog).toHaveCount(0);
}

async function openNoteDetailByTitle(page: Page, noteTitle: string) {
  const noteLink = page
    .getByRole("link", { name: noteTitle, exact: true })
    .first();
  await expect(noteLink).toBeVisible();
  const noteHref = await noteLink.getAttribute("href");
  expect(noteHref).toBeTruthy();

  await expect(noteLink).toHaveAttribute("href", noteHref ?? "");
  const noteUrlPattern = new RegExp(`${escapeRegex(noteHref ?? "")}$`);
  await Promise.all([page.waitForURL(noteUrlPattern), noteLink.click()]);
  await expect(page).toHaveURL(noteUrlPattern);

  await expect(page.locator("#form-edit-note-title")).toHaveValue(noteTitle);
}

async function openNoteActions(page: Page) {
  await page
    .getByRole("main")
    .getByRole("button", { name: "Open note actions", exact: true })
    .click();
}

async function clickSubjectNewNote(page: Page, subjectName: string) {
  await clickSubjectDocumentsMenuItem(page, subjectName, "Add note");
}

async function createSidebarNote(
  page: Page,
  subjectName: string,
  title: string,
) {
  // Notes are created from the left-menu subject tree.
  await clickSubjectNewNote(page, subjectName);
  const createDialog = page.getByRole("dialog", { name: "Create Note" });
  await createDialog.locator("#form-create-note-title-input").fill(title);
  await createDialog.getByRole("button", { name: "Create Note" }).click();
  await expect(createDialog).toHaveCount(0);
  await expect(page.locator("#form-edit-note-title")).toHaveValue(title);
}

test("can create and open a note", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("create-open");
  const noteTitle = getUniqueNoteTitle("create-open");
  const noteContent = "Cell membranes regulate transport and communication.";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    await createSubject(user.userId, subjectName);
    await openSubjectInSidebar(page, subjectName);

    await clickSubjectNewNote(page, subjectName);
    await createNoteFromDialog(page, noteTitle);

    await expect(page).toHaveURL(/\/subjects\/.+\/documents\/notes\/.+$/);
    await expect(page.locator("#form-edit-note-title")).toHaveValue(noteTitle);
    await page.locator("#form-edit-note-content").click();
    await page.keyboard.type(noteContent);
    await expect(page.getByText(noteContent)).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can edit a note", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("edit");
  const initialTitle = getUniqueNoteTitle("edit-initial");
  const updatedTitle = getUniqueNoteTitle("edit-updated");
  const updatedContent = "Updated content for note edit validation.";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(user.userId, subjectName);

    const createdNote = await createNote(
      user.userId,
      createdSubject.id,
      initialTitle,
      "Initial",
    );

    await openSubjectInSidebar(page, subjectName);
    await expandSubjectSidebarRow(page, subjectName);
    await openNoteDetailByTitle(page, initialTitle);

    await page.locator("#form-edit-note-title").fill(updatedTitle);
    await expect
      .poll(async () => {
        const editedNote = await getNoteById(user.userId, createdNote.id);
        return editedNote?.title;
      })
      .toBe(updatedTitle);

    await page.locator("#form-edit-note-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(updatedContent);
    await expect
      .poll(async () => {
        const editedNote = await getNoteById(user.userId, createdNote.id);
        return editedNote?.content ?? "";
      })
      .toContain(updatedContent);

    await page.reload();
    await expect(page.locator("#form-edit-note-title")).toHaveValue(
      updatedTitle,
    );
    await expect(page.getByText(updatedContent)).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can create a title-only note from detail sidebar", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("sidebar-create");
  const initialTitle = getUniqueNoteTitle("sidebar-create-initial");
  const newTitle = getUniqueNoteTitle("sidebar-create-new");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(user.userId, subjectName);

    await createNote(user.userId, createdSubject.id, initialTitle, "Initial");

    await openSubjectInSidebar(page, subjectName);
    await expandSubjectSidebarRow(page, subjectName);
    await openNoteDetailByTitle(page, initialTitle);
    await createSidebarNote(page, subjectName, newTitle);

    await expect(page).toHaveURL(/\/subjects\/.+\/documents\/notes\/.+$/);
    await expect(page.locator("#form-edit-note-content")).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can delete a note", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("delete");
  const noteTitle = getUniqueNoteTitle("delete");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(user.userId, subjectName);

    await createNote(
      user.userId,
      createdSubject.id,
      noteTitle,
      "Delete from detail page",
    );

    await openSubjectInSidebar(page, subjectName);
    await expandSubjectSidebarRow(page, subjectName);
    await openNoteDetailByTitle(page, noteTitle);

    await openNoteActions(page);
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete Note" });
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(page.getByTestId("home-greeting")).toBeVisible();
    await expect(
      page.getByRole("link", { name: noteTitle, exact: true }),
    ).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("creates a flashcard from the open note through the assistant after confirmation", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getUniqueSubjectName("assistant-flashcards");
  const noteTitle = getUniqueNoteTitle("assistant-flashcards");
  const content =
    "Active recall and spaced repetition are core study practices.";
  const front = "What does active recall strengthen?";
  const subject = await createSubject(e2eUser.userId, subjectName);
  const assistant = new AssistantChatFixture([
    { front, back: "Retrieval through practice.", subjectPath: subjectName },
  ]);
  await assistant.install(page);

  try {
    const note = await createNote(
      e2eUser.userId,
      subject.id,
      noteTitle,
      content,
    );
    await page.goto(`/subjects/${subject.id}/documents/notes/${note.id}`);
    await page
      .locator("#form-edit-note-content")
      .fill(`${content} Retrieval improves with practice.`);
    await page.getByRole("button", { name: "Open study assistant" }).click();
    const composer = page.getByRole("textbox", {
      name: "Message the study assistant",
    });
    await composer.fill("Create a flashcard from this note");
    await composer.press("Enter");

    await expect(page.getByText(front, { exact: true })).toBeVisible();
    expect(assistant.requests.at(-1)?.documentDraft).toMatchObject({
      kind: "note",
      title: noteTitle,
      subjectPath: subjectName,
      blocks: [
        {
          id: "b0",
          html: `<p>${content} Retrieval improves with practice.</p>`,
        },
      ],
      partial: false,
    });
    expect(
      await countFlashcardsBySubjectForUser(e2eUser.userId, subject.id),
    ).toBe(0);

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      page.getByText("Flashcard created:", { exact: true }),
    ).toBeVisible();
    expect(
      await countFlashcardsBySubjectForUser(e2eUser.userId, subject.id),
    ).toBe(1);
    await page.goto(`/flashcards?view=manage&subjectId=${subject.id}`);
    await expect(page.getByTitle(front, { exact: true })).toBeVisible();
    const savedCards = await getFlashcardsManagePageForUser(e2eUser.userId, {
      pageIndex: 0,
      pageSize: 25,
      subjectId: subject.id,
    });
    const cardUrl = `/flashcards/${savedCards.items[0].id}`;
    await page.goto(cardUrl);
    const sourceLink = page.getByRole("link", {
      name: `Source note: ${noteTitle}`,
      exact: true,
    });
    await expect(sourceLink).toHaveAttribute(
      "href",
      `/subjects/${subject.id}/documents/notes/${note.id}`,
    );
    await page.reload();
    await sourceLink.click();
    await expect(page.locator("#form-edit-note-title")).toHaveValue(noteTitle);
    await openNoteActions(page);
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete Note" });
    await deleteDialog.getByRole("button", { name: "Delete" }).click();
    await expect(deleteDialog).toHaveCount(0);
    await page.goto(cardUrl);
    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      front,
    );
    await expect(sourceLink).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});
