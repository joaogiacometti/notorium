import type { Page } from "@playwright/test";
import { PLAYWRIGHT_GENERATED_CARDS } from "@/features/flashcards/ai";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserDecksByNames,
  clearUserSubjectsByNames,
  createDeck,
  createNote,
  createSubject,
} from "./support/db";
import { openSubjectDetailByName } from "./support/subjects";

function escapeRegex(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("note-subject", testTitle);
}

function getUniqueNoteTitle(testTitle: string) {
  return getPrefixedValue("note", testTitle);
}

function getUniqueDeckName(testTitle: string) {
  return getPrefixedValue("note-deck", testTitle);
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

async function createSidebarNote(page: Page, title: string) {
  await page.getByRole("button", { name: "Create note", exact: true }).click();
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
    await openSubjectDetailByName(page, subjectName);

    await createNoteFromDialog(page, noteTitle, noteContent);

    await openNoteDetailByTitle(page, noteTitle);
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

    await createNote(user.userId, createdSubject.id, initialTitle, "Initial");

    await openSubjectDetailByName(page, subjectName);
    await openNoteDetailByTitle(page, initialTitle);

    const savedToast = page.getByText("Note saved.", { exact: true });

    await page.locator("#form-edit-note-title").fill(updatedTitle);
    await expect(savedToast).toBeVisible();
    await expect(savedToast).toBeHidden();

    await page.locator("#form-edit-note-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(updatedContent);
    await expect(savedToast).toBeVisible();

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

    await openSubjectDetailByName(page, subjectName);
    await openNoteDetailByTitle(page, initialTitle);
    await createSidebarNote(page, newTitle);

    await expect(page).toHaveURL(/\/subjects\/.+\/notes\/.+$/);
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

    await openSubjectDetailByName(page, subjectName);
    await openNoteDetailByTitle(page, noteTitle);

    await openNoteActions(page);
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
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

test("can generate flashcards from a note with AI", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("ai-flashcards");
  const noteTitle = getUniqueNoteTitle("ai-flashcards");
  const deckName = getUniqueDeckName("ai-flashcards");

  await clearUserSubjectsByNames(user.userId, [subjectName]);
  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdSubject = await createSubject(user.userId, subjectName);
    const createdDeck = await createDeck(user.userId, deckName);

    await createNote(
      user.userId,
      createdSubject.id,
      noteTitle,
      "Active recall and spaced repetition are core study practices.",
    );

    await openSubjectDetailByName(page, subjectName);
    await openNoteDetailByTitle(page, noteTitle);

    await page
      .getByRole("button", { name: "Generate flashcards", exact: true })
      .click();

    const generateDialog = page.getByRole("dialog", {
      name: "Generate Flashcards",
    });
    await generateDialog
      .getByRole("button", { name: "Generate Flashcards", exact: true })
      .click();

    await expect(
      generateDialog.getByText(PLAYWRIGHT_GENERATED_CARDS[0].front),
    ).toBeVisible();
    await expect(
      generateDialog.getByText(PLAYWRIGHT_GENERATED_CARDS[1].front),
    ).toBeVisible();

    await generateDialog
      .getByRole("button", { name: "Create 2 Cards", exact: true })
      .click();
    await expect(generateDialog).toHaveCount(0);

    await page.goto(`/flashcards?view=manage&deckId=${createdDeck.id}`);
    await expect(
      page.getByTitle(PLAYWRIGHT_GENERATED_CARDS[0].front, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTitle(PLAYWRIGHT_GENERATED_CARDS[1].front, { exact: true }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});
