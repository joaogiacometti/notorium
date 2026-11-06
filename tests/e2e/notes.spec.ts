import type { Page } from "@playwright/test";
import {
  countFlashcardsByFolderForUser,
  getFlashcardsManagePageForUser,
} from "@/features/flashcards/queries";
import { getNoteConnectionsForUser } from "@/features/notes/queries";
import { documentToHtml } from "@/lib/editor/document-html";
import { getNoteDetailHref } from "@/lib/navigation/detail-page-back-link";
import { AssistantChatFixture } from "./support/assistant-chat-fixture";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserFoldersByNames,
  createFolder,
  createNote,
  ensureApprovedE2EWorkerUser,
  getNoteById,
  updateNoteContent,
} from "./support/db";
import {
  clickFolderDocumentsMenuItem,
  expandFolderSidebarRow,
  openFolderInSidebar,
} from "./support/folders";

function escapeRegex(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function getUniqueFolderName(testTitle: string) {
  return getPrefixedValue("note-folder", testTitle);
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

async function clickFolderNewNote(page: Page, folderName: string) {
  await clickFolderDocumentsMenuItem(page, folderName, "Add note");
}

async function createSidebarNote(
  page: Page,
  folderName: string,
  title: string,
) {
  // Notes are created from the left-menu folder tree.
  await clickFolderNewNote(page, folderName);
  const createDialog = page.getByRole("dialog", { name: "Create Note" });
  await createDialog.locator("#form-create-note-title-input").fill(title);
  await createDialog.getByRole("button", { name: "Create Note" }).click();
  await expect(createDialog).toHaveCount(0);
  await expect(page.locator("#form-edit-note-title")).toHaveValue(title);
}

test("can create and open a note", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const folderName = getUniqueFolderName("create-open");
  const noteTitle = getUniqueNoteTitle("create-open");
  const noteContent = "Cell membranes regulate transport and communication.";

  await clearUserFoldersByNames(user.userId, [folderName]);

  try {
    await createFolder(user.userId, folderName);
    await openFolderInSidebar(page, folderName);

    await clickFolderNewNote(page, folderName);
    await createNoteFromDialog(page, noteTitle);

    await expect(page).toHaveURL(/\/folders\/.+\/documents\/notes\/.+$/);
    await expect(page.locator("#form-edit-note-title")).toHaveValue(noteTitle);
    await page.locator("#form-edit-note-content").click();
    await page.keyboard.type(noteContent);
    await expect(page.getByText(noteContent)).toBeVisible();
  } finally {
    await clearUserFoldersByNames(user.userId, [folderName]);
  }
});

test("can edit a note", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const folderName = getUniqueFolderName("edit");
  const initialTitle = getUniqueNoteTitle("edit-initial");
  const updatedTitle = getUniqueNoteTitle("edit-updated");
  const updatedContent = "Updated content for note edit validation.";

  await clearUserFoldersByNames(user.userId, [folderName]);

  try {
    const createdFolder = await createFolder(user.userId, folderName);

    const createdNote = await createNote(
      user.userId,
      createdFolder.id,
      initialTitle,
      "Initial",
    );

    await openFolderInSidebar(page, folderName);
    await expandFolderSidebarRow(page, folderName);
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
        return editedNote?.content ? documentToHtml(editedNote.content) : "";
      })
      .toContain(updatedContent);

    await page.reload();
    await expect(page.locator("#form-edit-note-title")).toHaveValue(
      updatedTitle,
    );
    await expect(page.getByText(updatedContent)).toBeVisible();
  } finally {
    await clearUserFoldersByNames(user.userId, [folderName]);
  }
});

test("can create a title-only note from detail sidebar", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const folderName = getUniqueFolderName("sidebar-create");
  const initialTitle = getUniqueNoteTitle("sidebar-create-initial");
  const newTitle = getUniqueNoteTitle("sidebar-create-new");

  await clearUserFoldersByNames(user.userId, [folderName]);

  try {
    const createdFolder = await createFolder(user.userId, folderName);

    await createNote(user.userId, createdFolder.id, initialTitle, "Initial");

    await openFolderInSidebar(page, folderName);
    await expandFolderSidebarRow(page, folderName);
    await openNoteDetailByTitle(page, initialTitle);
    await createSidebarNote(page, folderName, newTitle);

    await expect(page).toHaveURL(/\/folders\/.+\/documents\/notes\/.+$/);
    await expect(page.locator("#form-edit-note-content")).toBeVisible();
  } finally {
    await clearUserFoldersByNames(user.userId, [folderName]);
  }
});

test("can delete a note", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const folderName = getUniqueFolderName("delete");
  const noteTitle = getUniqueNoteTitle("delete");

  await clearUserFoldersByNames(user.userId, [folderName]);

  try {
    const createdFolder = await createFolder(user.userId, folderName);

    await createNote(
      user.userId,
      createdFolder.id,
      noteTitle,
      "Delete from detail page",
    );

    await openFolderInSidebar(page, folderName);
    await expandFolderSidebarRow(page, folderName);
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
    await clearUserFoldersByNames(user.userId, [folderName]);
  }
});

test("creates a flashcard from the open note through the assistant after confirmation", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("assistant-flashcards");
  const noteTitle = getUniqueNoteTitle("assistant-flashcards");
  const content =
    "Active recall and spaced repetition are core study practices.";
  const front = "What does active recall strengthen?";
  const folder = await createFolder(e2eUser.userId, folderName);
  const assistant = new AssistantChatFixture([
    { front, back: "Retrieval through practice.", folderPath: folderName },
  ]);
  await assistant.install(page);

  try {
    const note = await createNote(
      e2eUser.userId,
      folder.id,
      noteTitle,
      content,
    );
    await page.goto(`/folders/${folder.id}/documents/notes/${note.id}`);
    await page
      .locator("#form-edit-note-content")
      .fill(`${content} Retrieval improves with practice.`);
    await page.getByRole("button", { name: "Open assistant" }).click();
    const composer = page.getByRole("textbox", {
      name: "Message the assistant",
    });
    await composer.fill("Create a flashcard from this note");
    await composer.press("Enter");

    await expect(page.getByText(front, { exact: true })).toBeVisible();
    expect(assistant.requests.at(-1)?.documentDraft).toMatchObject({
      kind: "note",
      title: noteTitle,
      folderPath: folderName,
      blocks: [
        {
          id: "b0",
          html: `<p>${content} Retrieval improves with practice.</p>`,
        },
      ],
      partial: false,
    });
    expect(
      await countFlashcardsByFolderForUser(e2eUser.userId, folder.id),
    ).toBe(0);

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      page.getByText("Flashcard created:", { exact: true }),
    ).toBeVisible();
    expect(
      await countFlashcardsByFolderForUser(e2eUser.userId, folder.id),
    ).toBe(1);
    await page.goto(`/flashcards?view=manage&folderId=${folder.id}`);
    await expect(page.getByTitle(front, { exact: true })).toBeVisible();
    const savedCards = await getFlashcardsManagePageForUser(e2eUser.userId, {
      pageIndex: 0,
      pageSize: 25,
      folderId: folder.id,
    });
    const cardUrl = `/flashcards/${savedCards.items[0].id}`;
    await page.goto(cardUrl);
    const sourceLink = page.getByRole("link", {
      name: `Source note: ${noteTitle}`,
      exact: true,
    });
    await expect(sourceLink).toHaveAttribute(
      "href",
      `/folders/${folder.id}/documents/notes/${note.id}`,
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
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("links notes with [[, follows the link, and tracks backlinks and renames", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("note-links");
  const sourceTitle = getUniqueNoteTitle("link-source");
  const targetTitle = getUniqueNoteTitle("link-target");
  const renamedTitle = getUniqueNoteTitle("link-renamed");
  const otherUser = await ensureApprovedE2EWorkerUser(900);
  const otherFolderName = getUniqueFolderName("note-links-other");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  await clearUserFoldersByNames(otherUser.userId, [otherFolderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);
    const source = await createNote(e2eUser.userId, folder.id, sourceTitle, "");
    const target = await createNote(e2eUser.userId, folder.id, targetTitle, "");

    await page.goto(getNoteDetailHref(folder.id, source.id));
    await page.locator("#form-edit-note-content").click();
    await page.keyboard.type(`[[${targetTitle}`);
    await page.getByRole("option", { name: targetTitle }).click();

    const chip = page
      .locator("#form-edit-note-content")
      .getByRole("link", { name: targetTitle });
    await expect(chip).toBeVisible();
    await expect
      .poll(async () => {
        const content = (await getNoteById(e2eUser.userId, source.id))?.content;
        return content ? documentToHtml(content) : "";
      })
      .toContain(`data-note-id="${target.id}"`);

    await chip.click();
    await expect(page).toHaveURL(
      new RegExp(`${escapeRegex(getNoteDetailHref(folder.id, target.id))}$`),
    );
    const linkedFrom = page.getByRole("region", { name: "Linked from" });
    await expect(
      linkedFrom.getByRole("link", { name: sourceTitle }),
    ).toBeVisible();

    await page.locator("#form-edit-note-title").fill(renamedTitle);
    await expect
      .poll(async () => (await getNoteById(e2eUser.userId, target.id))?.title)
      .toBe(renamedTitle);

    await expect
      .poll(
        async () =>
          (await getNoteConnectionsForUser(e2eUser.userId, source.id))
            ?.outgoing,
      )
      .toEqual([{ id: target.id, title: renamedTitle, folderId: folder.id }]);
    await page.goto(getNoteDetailHref(folder.id, source.id));
    await expect(
      page
        .locator("#form-edit-note-content")
        .getByRole("link", { name: renamedTitle }),
    ).toBeVisible();

    // Stored document nodes are the source: other accounts, self-links, and text that only
    // mentions the attribute must not count as backlinks.
    const linkTo = (noteId: string) =>
      `<p><a data-note-id="${noteId}" data-note-link="" href="/notes/${noteId}">x</a></p>`;
    const otherFolder = await createFolder(otherUser.userId, otherFolderName);
    const foreign = await createNote(
      otherUser.userId,
      otherFolder.id,
      "foreign",
      linkTo(target.id),
    );
    await createNote(
      e2eUser.userId,
      folder.id,
      "plain mention",
      "<p>data-note-id</p>",
    );
    await updateNoteContent(e2eUser.userId, target.id, linkTo(target.id));
    const targetView = await getNoteConnectionsForUser(
      e2eUser.userId,
      target.id,
    );
    expect(targetView?.backlinks.map((note) => note.id)).toEqual([source.id]);

    const foreignView = await getNoteConnectionsForUser(
      otherUser.userId,
      foreign.id,
    );
    expect(foreignView?.outgoing).toEqual([]);
    expect(foreignView?.missingIds).toEqual([target.id]);
    expect(
      await getNoteConnectionsForUser(otherUser.userId, target.id),
    ).toBeNull();
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
    await clearUserFoldersByNames(otherUser.userId, [otherFolderName]);
  }
});
