import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import { clearUserFoldersByNames, createFolder } from "./support/db";
import { createFlashcardForFolder } from "./support/flashcards";
import { breadcrumbCurrent } from "./support/page-chrome";

function getUniqueFolderName(testTitle: string) {
  return getPrefixedValue("flashcard-folder", testTitle);
}

function getUniqueFlashcardFront(testTitle: string) {
  return getPrefixedValue("flashcard-front", testTitle).replace(
    /[a-z0-9]{6}$/,
    (suffix) => suffix.replaceAll("x", "q"),
  );
}

function getUniqueFlashcardBack(testTitle: string) {
  return getPrefixedValue("flashcard-back", testTitle).replace(
    /[a-z0-9]{6}$/,
    (suffix) => suffix.replaceAll("x", "q"),
  );
}

function escapeRegex(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

async function openFlashcardsManagePage(page: Page, folderId?: string) {
  const query = new URLSearchParams({ view: "manage" });
  if (folderId) query.set("folderId", folderId);

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
}

async function openFlashcardsReviewPage(page: Page, folderId?: string) {
  const query = new URLSearchParams({ view: "review" });
  if (folderId) query.set("folderId", folderId);

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
}

function getSessionFolderLabel(page: Page, folderName: string) {
  return page
    .locator("p")
    .filter({ hasText: new RegExp(`^${escapeRegex(folderName)}$`) })
    .last();
}

async function fillRichTextEditor(editor: Locator, value: string) {
  await expect(editor).toBeVisible();
  await editor.click();
  await editor.press("Control+A");
  await editor.press("Backspace");
  await editor.pressSequentially(value);
}

async function openCreateFlashcardDialog(page: Page) {
  await page
    .getByRole("button", { name: "New Flashcard", exact: true })
    .click();

  return page.getByRole("dialog", { name: "New flashcard" });
}

async function createFlashcardFromManageDialog(
  page: Page,
  front: string,
  back: string,
) {
  const createDialog = await openCreateFlashcardDialog(page);
  await fillRichTextEditor(
    createDialog.locator("#form-create-flashcard-front"),
    front,
  );
  await fillRichTextEditor(
    createDialog.locator("#form-create-flashcard-back"),
    back,
  );
  await createDialog
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(page.getByTitle(front, { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(createDialog).toHaveCount(0);
}

async function openFlashcardDetailFromManage(page: Page, front: string) {
  const frontPreview = page.getByTitle(front, { exact: true }).first();
  await expect(frontPreview).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/flashcards\/.+\?from=flashcards-manage/),
    frontPreview.click(),
  ]);
  await expect(page.locator("#form-edit-flashcard-front")).toContainText(front);
}

test("can create and open a flashcard", async ({ page, e2eUser }) => {
  const folderName = getUniqueFolderName("create-open");
  const flashcardFront = getUniqueFlashcardFront("create-open");
  const flashcardBack = getUniqueFlashcardBack("create-open");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);

    await openFlashcardsManagePage(page, folder.id);
    await createFlashcardFromManageDialog(page, flashcardFront, flashcardBack);

    await openFlashcardDetailFromManage(page, flashcardFront);
    await expect(page.getByText("Front", { exact: true })).toBeVisible();
    await expect(page.getByText("Back", { exact: true })).toBeVisible();
    await expect(breadcrumbCurrent(page, folderName)).toBeVisible();
    await expect(page.getByText(flashcardBack).first()).toBeVisible();
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("can edit a flashcard", async ({ page, e2eUser }) => {
  const folderName = getUniqueFolderName("edit");
  const initialFront = getUniqueFlashcardFront("edit-initial");
  const initialBack = getUniqueFlashcardBack("edit-initial");
  const updatedFront = getUniqueFlashcardFront("edit-updated");
  const updatedBack = getUniqueFlashcardBack("edit-updated");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);
    const flashcard = await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      initialFront,
      initialBack,
    );

    await page.goto(`/flashcards/${flashcard.id}?from=flashcards-manage`);
    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      initialFront,
    );

    const savePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/flashcards\/.+/.test(response.url()) &&
        response.status() === 200,
    );

    await fillRichTextEditor(
      page.locator("#form-edit-flashcard-front"),
      updatedFront,
    );
    await fillRichTextEditor(
      page.locator("#form-edit-flashcard-back"),
      updatedBack,
    );
    await savePromise;

    await page.reload();
    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      updatedFront,
    );
    await expect(page.locator("#form-edit-flashcard-back")).toContainText(
      updatedBack,
    );
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("can delete a flashcard", async ({ page, e2eUser }) => {
  const folderName = getUniqueFolderName("delete");
  const flashcardFront = getUniqueFlashcardFront("delete");
  const flashcardBack = getUniqueFlashcardBack("delete");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);
    const flashcard = await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      flashcardFront,
      flashcardBack,
    );

    await page.goto(`/flashcards/${flashcard.id}?from=flashcards-manage`);
    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      flashcardFront,
    );

    await page
      .getByRole("button", { name: "Open flashcard actions", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete Flashcard" });
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/flashcards\?view=manage/);
    await openFlashcardsManagePage(page, folder.id);
    await expect(page.getByText(flashcardFront, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("can switch between folder-scoped flashcards views", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("view-switch");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);

    await openFlashcardsReviewPage(page, folder.id);
    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeDisabled();

    await page.getByRole("tab", { name: "Manage", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "New Flashcard", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`folderId=${folder.id}`));
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("can search folder-scoped manage flashcards without hanging", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("manage-search");
  const matchingFront = getUniqueFlashcardFront("manage-search-match");
  const matchingBack = getUniqueFlashcardBack("manage-search-match");
  const otherFront = getUniqueFlashcardFront("manage-search-other");
  const otherBack = getUniqueFlashcardBack("manage-search-other");
  const searchTerm = "manage-search-match";

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);
    await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      matchingFront,
      matchingBack,
    );
    await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      otherFront,
      otherBack,
    );

    await openFlashcardsManagePage(page, folder.id);
    await page
      .getByPlaceholder("Search front, back, or folder path...")
      .fill(searchTerm);

    await expect(page).toHaveURL(
      new RegExp(`search=${escapeRegex(searchTerm)}`),
    );
    await expect(
      page.getByTestId("flashcards-manage-table-loading"),
    ).toHaveCount(0);
    await expect(page.getByTitle(matchingFront, { exact: true })).toBeVisible();
    await expect(page.getByTitle(otherFront, { exact: true })).toHaveCount(0);
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("can enter, reload, and exit a review session", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("review-session");
  const flashcardFront = getUniqueFlashcardFront("review-session");
  const flashcardBack = getUniqueFlashcardBack("review-session");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);
    await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      flashcardFront,
      flashcardBack,
    );

    await openFlashcardsReviewPage(page, folder.id);
    await page.getByRole("link", { name: "Start review", exact: true }).click();

    await expect(
      page.getByText(/due of \d+ total cards/).first(),
    ).toBeVisible();
    await expect(getSessionFolderLabel(page, folderName)).toBeVisible();
    await expect(page.getByText(flashcardFront)).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/flashcards/review\\?folderId=${folder.id}`),
    );

    await page.reload();
    await expect(page.getByText(flashcardFront)).toBeVisible();

    await page.getByRole("button", { name: "Exit review" }).click();
    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("can complete a review session", async ({ page, e2eUser }) => {
  const folderName = getUniqueFolderName("focus-review");
  const flashcardFront = getUniqueFlashcardFront("focus-review");
  const flashcardBack = getUniqueFlashcardBack("focus-review");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);
    await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      flashcardFront,
      flashcardBack,
    );

    await openFlashcardsReviewPage(page, folder.id);
    await page.getByRole("link", { name: "Start review", exact: true }).click();

    await expect(page.getByText(flashcardFront)).toBeVisible();
    await page.getByRole("button", { name: "Show answer" }).click();
    await expect(page.getByText(flashcardBack)).toBeVisible();
    await page.getByRole("button", { name: /Easy/i }).click();

    await expect(page.getByText("All caught up")).toBeVisible();
    await expect(
      page.getByText("No due flashcards in this scope right now."),
    ).toBeVisible();
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("review and exam actions respect folder scope", async ({
  page,
  e2eUser,
}) => {
  const dueFolderName = getUniqueFolderName("scope-actions-due");
  const examFolderName = getUniqueFolderName("scope-actions-exam-only");
  const dueFront = getUniqueFlashcardFront("scope-actions-due");
  const dueBack = getUniqueFlashcardBack("scope-actions-due");
  const examFront = getUniqueFlashcardFront("scope-actions-exam-only");
  const examBack = getUniqueFlashcardBack("scope-actions-exam-only");

  await clearUserFoldersByNames(e2eUser.userId, [
    dueFolderName,
    examFolderName,
  ]);

  try {
    const dueFolder = await createFolder(e2eUser.userId, dueFolderName);
    const examFolder = await createFolder(e2eUser.userId, examFolderName);
    await createFlashcardForFolder(
      e2eUser.userId,
      dueFolder.id,
      dueFront,
      dueBack,
    );
    await createFlashcardForFolder(
      e2eUser.userId,
      examFolder.id,
      examFront,
      examBack,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    await openFlashcardsReviewPage(page, dueFolder.id);
    await page.getByRole("link", { name: "Start review", exact: true }).click();
    await expect(page.getByText(dueFront, { exact: true })).toBeVisible();
    await expect(page.getByText(examFront, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Exit review" }).click();
    await openFlashcardsReviewPage(page, examFolder.id);
    await page.getByRole("link", { name: "Start exam", exact: true }).click();
    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(getSessionFolderLabel(page, examFolderName)).toBeVisible();
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [
      dueFolderName,
      examFolderName,
    ]);
  }
});

test("study later defers a card in review and lists it in manage", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("study-later");
  const deferredFront = getUniqueFlashcardFront("study-later-deferred");
  const otherFront = getUniqueFlashcardFront("study-later-other");

  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    const folder = await createFolder(e2eUser.userId, folderName);
    await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      deferredFront,
      getUniqueFlashcardBack("study-later-deferred"),
      new Date(Date.now() - 2 * 60 * 1000),
    );
    await createFlashcardForFolder(
      e2eUser.userId,
      folder.id,
      otherFront,
      getUniqueFlashcardBack("study-later-other"),
      new Date(Date.now() - 60 * 1000),
    );

    await openFlashcardsReviewPage(page, folder.id);
    await page.getByRole("link", { name: "Start review", exact: true }).click();
    await expect(page.getByText(deferredFront)).toBeVisible();

    // The mark saves in the background; reload only once it has landed.
    const markSaved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/flashcards\/review/.test(response.url()) &&
        response.status() === 200,
    );
    await page.getByRole("button", { name: "Open review actions" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Study later" }).click();
    await expect(page.getByText(otherFront)).toBeVisible();
    await markSaved;

    await page.reload();
    await expect(page.getByText(otherFront)).toBeVisible();
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name: /Easy/i }).click();
    await expect(page.getByText(deferredFront)).toBeVisible();
    await page.getByRole("button", { name: "Exit review" }).click();
    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();

    await openFlashcardsManagePage(page, folder.id);
    await page.getByRole("button", { name: "Show Study later cards" }).click();
    await expect(page).toHaveURL(/filter=studyLater/);
    const deferredRow = page
      .getByRole("link")
      .filter({ has: page.getByTitle(deferredFront, { exact: true }) });
    await expect(deferredRow).toBeVisible();
    await expect(page.getByTitle(otherFront, { exact: true })).toHaveCount(0);

    await deferredRow.getByTitle(deferredFront, { exact: true }).click();
    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      deferredFront,
    );
    await page.getByRole("button", { name: "Open flashcard actions" }).click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Study later" }),
    ).toBeChecked();
    await page.keyboard.press("Escape");
    await page.goBack();
    await expect(deferredRow).toBeVisible();

    // Row actions only take pointer events while the row is hovered.
    await deferredRow.hover();
    await deferredRow
      .getByRole("button", { name: "Open flashcard actions" })
      .click();
    await page
      .getByRole("menuitemcheckbox", { name: "Study later", checked: true })
      .click();
    await expect(page.getByTitle(deferredFront, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});
