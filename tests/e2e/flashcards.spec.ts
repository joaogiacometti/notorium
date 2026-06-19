import type { Locator, Page } from "@playwright/test";
import { PLAYWRIGHT_GENERATED_BACK } from "@/features/flashcards/ai";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserDecksByNames,
  createDeck,
  createFlashcardForDeck,
} from "./support/db";
import { breadcrumbCurrent } from "./support/page-chrome";

function getUniqueFlashcardFront(testTitle: string) {
  return getPrefixedValue("flashcard-front", testTitle);
}

function getUniqueFlashcardBack(testTitle: string) {
  return getPrefixedValue("flashcard-back", testTitle);
}

function getUniqueDeckName(testTitle: string) {
  return getPrefixedValue("flashcard-deck", testTitle);
}

function escapeRegex(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

async function openFlashcardsManagePage(page: Page, deckId?: string) {
  const query = new URLSearchParams();
  query.set("view", "manage");

  if (deckId) {
    query.set("deckId", deckId);
  }

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
}

async function openFlashcardsReviewPage(page: Page, deckId?: string) {
  const query = new URLSearchParams();
  query.set("view", "review");

  if (deckId) {
    query.set("deckId", deckId);
  }

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
}

async function openFlashcardsStatisticsPage(page: Page, deckId?: string) {
  const query = new URLSearchParams();
  query.set("view", "statistics");

  if (deckId) {
    query.set("deckId", deckId);
  }

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
}

function getDeckSidebar(page: Page) {
  // The deck sidebar is a nested <aside> inside the app's left-menu landmark,
  // so `getByRole("complementary")` is ambiguous. Anchor on the deck tree's
  // own scope test id and walk up to its enclosing <aside>.
  return page
    .getByTestId("deck-tree-root-scope")
    .locator("xpath=ancestor::aside[1]");
}

function getDeckButton(sidebar: Locator, deckName: string, count: number) {
  return sidebar.getByRole("button", {
    name: new RegExp(String.raw`^${escapeRegex(deckName)}\s*${count}$`),
  });
}

function getFocusModeDeckLabel(page: Page, deckName: string) {
  return page
    .locator("main p")
    .filter({ hasText: new RegExp(`^${escapeRegex(deckName)}$`) })
    .last();
}

async function fillRichTextEditor(editor: Locator, value: string) {
  await expect(editor).toBeVisible();
  await editor.click();
  await editor.press("Control+A");
  await editor.press("Backspace");
  await editor.pressSequentially(value);
}

async function fillFlashcardEditors(
  dialog: Locator,
  formId: "form-create-flashcard" | "form-edit-flashcard",
  front: string,
  back: string,
) {
  await fillRichTextEditor(dialog.locator(`#${formId}-front`), front);
  await fillRichTextEditor(dialog.locator(`#${formId}-back`), back);
}

async function openCreateFlashcardDialog(page: Page) {
  await page
    .getByRole("button", { name: "New Flashcard", exact: true })
    .click();

  return page.getByRole("dialog", { name: "Create Flashcard" });
}

async function createFlashcardFromManageDialog(
  page: Page,
  front: string,
  back: string,
) {
  const createDialog = await openCreateFlashcardDialog(page);
  await fillFlashcardEditors(
    createDialog,
    "form-create-flashcard",
    front,
    back,
  );
  await createDialog.getByRole("button", { name: "Create Flashcard" }).click();
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

async function openFlashcardActionsMenu(page: Page) {
  await page
    .getByRole("button", { name: "Open flashcard actions", exact: true })
    .click();
}

test("can create and open a flashcard", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("create-open");
  const flashcardFront = getUniqueFlashcardFront("create-open");
  const flashcardBack = getUniqueFlashcardBack("create-open");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Flashcards create smoke test",
    );

    await openFlashcardsManagePage(page, createdDeck.id);
    await createFlashcardFromManageDialog(page, flashcardFront, flashcardBack);

    await openFlashcardDetailFromManage(page, flashcardFront);
    await expect(
      page
        .locator('nav[aria-label="Breadcrumb"]')
        .getByRole("link", { name: "Flashcards", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Front", { exact: true })).toBeVisible();
    await expect(page.getByText("Back", { exact: true })).toBeVisible();
    await expect(
      page.getByText(`Deck: ${deckName}`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(flashcardBack).first()).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can generate a single flashcard back with AI", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("ai-single-back");
  const flashcardFront = getUniqueFlashcardFront("ai-single-back");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "AI single back generation test",
    );

    await openFlashcardsManagePage(page, createdDeck.id);
    const createDialog = await openCreateFlashcardDialog(page);
    await fillRichTextEditor(
      createDialog.locator("#form-create-flashcard-front"),
      flashcardFront,
    );

    await createDialog
      .getByRole("button", { name: "Generate with AI", exact: true })
      .click();
    await expect(
      createDialog.locator("#form-create-flashcard-back"),
    ).toContainText(PLAYWRIGHT_GENERATED_BACK);

    await createDialog
      .getByRole("button", { name: "Create Flashcard", exact: true })
      .click();
    await expect(
      page.getByTitle(flashcardFront, { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(createDialog).toHaveCount(0);

    await openFlashcardDetailFromManage(page, flashcardFront);
    await expect(
      page.getByText(PLAYWRIGHT_GENERATED_BACK).first(),
    ).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can validate flashcards with AI", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("ai-validation");
  const issueFront = getUniqueFlashcardFront("ai-validation-fixture issue");
  const cleanFront = getUniqueFlashcardFront("ai-validation-clean");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "AI validation results test",
    );

    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      issueFront,
      "Too vague.",
    );
    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      cleanFront,
      "Specific enough for validation.",
    );

    await openFlashcardsManagePage(page, createdDeck.id);
    await page.getByRole("button", { name: "AI tools" }).click();
    await page.getByRole("menuitem", { name: "Validate cards" }).click();

    const validateDialog = page.getByRole("dialog", {
      name: "Validate Flashcards",
    });
    await expect(validateDialog.getByText("the selected deck")).toBeVisible();
    await validateDialog
      .getByRole("button", { name: "Validate", exact: true })
      .click();

    await expect(page.getByText("Confusing", { exact: true })).toBeVisible();
    await expect(page.getByTitle(issueFront, { exact: true })).toBeVisible();
    await expect(
      page.getByText(deckName, { exact: true }).first(),
    ).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can edit a flashcard", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("edit");
  const initialFront = getUniqueFlashcardFront("edit-initial");
  const initialBack = getUniqueFlashcardBack("edit-initial");
  const updatedFront = getUniqueFlashcardFront("edit-updated");
  const updatedBack = getUniqueFlashcardBack("edit-updated");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Flashcards edit smoke test",
    );

    const createdFlashcard = await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      initialFront,
      initialBack,
    );

    await page.goto(
      `/flashcards/${createdFlashcard.id}?from=flashcards-manage`,
    );
    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      initialFront,
    );

    const savePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/flashcards\/.+/.test(response.url()) &&
        response.status() === 200,
      { timeout: 10000 },
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

    await page.goto("/flashcards?view=manage");
    await page.goto(
      `/flashcards/${createdFlashcard.id}?from=flashcards-manage`,
    );

    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      updatedFront,
    );
    await expect(page.locator("#form-edit-flashcard-back")).toContainText(
      updatedBack,
    );
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can delete a flashcard", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("delete");
  const flashcardFront = getUniqueFlashcardFront("delete");
  const flashcardBack = getUniqueFlashcardBack("delete");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Flashcards delete smoke test",
    );

    const createdFlashcard = await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      flashcardFront,
      flashcardBack,
    );

    await page.goto(
      `/flashcards/${createdFlashcard.id}?from=flashcards-manage`,
    );
    await expect(page.locator("#form-edit-flashcard-front")).toContainText(
      flashcardFront,
    );

    await openFlashcardActionsMenu(page);
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete Flashcard" });
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
    await expect(page).toHaveURL(/\/flashcards\?view=manage/);

    await openFlashcardsManagePage(page, createdDeck.id);
    await expect(page.getByText(flashcardFront, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can switch between deck-scoped flashcards views", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("view-switch");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Flashcards view switch smoke test",
    );

    await openFlashcardsReviewPage(page, createdDeck.id);

    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeVisible();
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
    await expect(page).toHaveURL(
      new RegExp(`deckId=${escapeRegex(createdDeck.id)}`),
    );
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can search deck-scoped manage flashcards without hanging", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("manage-search");
  const matchingFront = getUniqueFlashcardFront("manage-search-match");
  const matchingBack = getUniqueFlashcardBack("manage-search-match");
  const otherFront = getUniqueFlashcardFront("manage-search-other");
  const otherBack = getUniqueFlashcardBack("manage-search-other");
  const searchTerm = "manage-search-match";

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Flashcards manage search regression test",
    );

    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      matchingFront,
      matchingBack,
    );
    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      otherFront,
      otherBack,
    );

    await openFlashcardsManagePage(page, createdDeck.id);
    await page
      .getByPlaceholder("Search front, back, or deck path...")
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
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can enter and exit Focus Mode", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("focus-mode");
  const flashcardFront = getUniqueFlashcardFront("focus-mode");
  const flashcardBack = getUniqueFlashcardBack("focus-mode");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Focus Mode smoke test",
    );

    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      flashcardFront,
      flashcardBack,
    );

    await openFlashcardsReviewPage(page, createdDeck.id);

    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(
      page.getByText(/due of \d+ total cards/).first(),
    ).toBeVisible();
    await expect(getFocusModeDeckLabel(page, deckName)).toBeVisible();
    await expect(page.getByText(flashcardFront)).toBeVisible();

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();

    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can complete a review in Focus Mode", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("focus-review");
  const flashcardFront = getUniqueFlashcardFront("focus-review");
  const flashcardBack = getUniqueFlashcardBack("focus-review");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Focus Mode review smoke test",
    );

    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      flashcardFront,
      flashcardBack,
    );

    await openFlashcardsReviewPage(page, createdDeck.id);

    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(page.getByText(flashcardFront)).toBeVisible();
    await page.getByRole("button", { name: "Show answer" }).click();

    await expect(page.getByText(flashcardBack)).toBeVisible();
    await expect(page.getByRole("button", { name: /Easy/i })).toBeVisible();

    await page.getByRole("button", { name: /Easy/i }).click();

    await expect(page.getByText("All caught up")).toBeVisible();
    await expect(
      page.getByText("No due flashcards in this scope right now."),
    ).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can start exam mode from review hub on first click", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("exam-start");
  const flashcardFront = getUniqueFlashcardFront("exam-start");
  const flashcardBack = getUniqueFlashcardBack("exam-start");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(
      user.userId,
      deckName,
      "Exam start smoke test",
    );

    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      flashcardFront,
      flashcardBack,
    );

    await openFlashcardsReviewPage(page, createdDeck.id);

    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start exam", exact: true }).click();

    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Front", exact: true }),
    ).toBeVisible();
    await expect(getFocusModeDeckLabel(page, deckName)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show answer", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();
    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("review and exam actions respect deck scope", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const dueDeckName = getUniqueDeckName("scope-actions-due");
  const examOnlyDeckName = getUniqueDeckName("scope-actions-exam-only");
  const dueDeckFront = getUniqueFlashcardFront("scope-actions-due");
  const dueDeckBack = getUniqueFlashcardBack("scope-actions-due");
  const examDeckFront = getUniqueFlashcardFront("scope-actions-exam-only");
  const examDeckBack = getUniqueFlashcardBack("scope-actions-exam-only");

  await clearUserDecksByNames(user.userId, [dueDeckName, examOnlyDeckName]);

  try {
    const dueDeck = await createDeck(
      user.userId,
      dueDeckName,
      "Deck with due cards",
    );
    const examOnlyDeck = await createDeck(
      user.userId,
      examOnlyDeckName,
      "Deck with cards not due yet",
    );

    await createFlashcardForDeck(
      user.userId,
      dueDeck.id,
      dueDeckFront,
      dueDeckBack,
    );

    await createFlashcardForDeck(
      user.userId,
      examOnlyDeck.id,
      examDeckFront,
      examDeckBack,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    await openFlashcardsReviewPage(page, dueDeck.id);

    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(page.getByText(dueDeckFront, { exact: true })).toBeVisible();
    await expect(page.getByText(examDeckFront, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();
    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();

    await openFlashcardsReviewPage(page, examOnlyDeck.id);

    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeEnabled();

    await page.getByRole("button", { name: "Start exam", exact: true }).click();

    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(getFocusModeDeckLabel(page, examOnlyDeckName)).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [dueDeckName, examOnlyDeckName]);
  }
});

test("review hub updates immediately when deck is changed from the sidebar", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const populatedDeckName = getUniqueDeckName("review-sidebar-populated");
  const emptyDeckName = getUniqueDeckName("review-sidebar-empty");
  const populatedDeckFront = getUniqueFlashcardFront(
    "review-sidebar-populated",
  );
  const populatedDeckBack = getUniqueFlashcardBack("review-sidebar-populated");

  await clearUserDecksByNames(user.userId, [populatedDeckName, emptyDeckName]);

  try {
    const populatedDeck = await createDeck(
      user.userId,
      populatedDeckName,
      "Deck with one due card",
    );
    const emptyDeck = await createDeck(
      user.userId,
      emptyDeckName,
      "Deck with no cards",
    );

    await createFlashcardForDeck(
      user.userId,
      populatedDeck.id,
      populatedDeckFront,
      populatedDeckBack,
    );

    await openFlashcardsReviewPage(page, populatedDeck.id);
    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();

    await expect(page.getByText("1 due", { exact: true })).toBeVisible();
    await expect(page.getByText("1 card", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeEnabled();

    const sidebar = getDeckSidebar(page);
    await getDeckButton(sidebar, emptyDeckName, 0).click();

    await expect(page).toHaveURL(
      new RegExp(`deckId=${escapeRegex(emptyDeck.id)}`),
    );
    await expect(page.getByText("0 due", { exact: true })).toBeVisible();
    await expect(page.getByText("0 cards", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeDisabled();

    await getDeckButton(sidebar, populatedDeckName, 1).click();

    await expect(page).toHaveURL(
      new RegExp(`deckId=${escapeRegex(populatedDeck.id)}`),
    );
    await expect(page.getByText("1 due", { exact: true })).toBeVisible();
    await expect(page.getByText("1 card", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeEnabled();
  } finally {
    await clearUserDecksByNames(user.userId, [
      populatedDeckName,
      emptyDeckName,
    ]);
  }
});

test("mobile review shows actions before deck library and supports scope changes", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const populatedDeckName = getUniqueDeckName("mobile-review-populated");
  const emptyDeckName = getUniqueDeckName("mobile-review-empty");
  const populatedDeckFront = getUniqueFlashcardFront("mobile-review-populated");
  const populatedDeckBack = getUniqueFlashcardBack("mobile-review-populated");

  await clearUserDecksByNames(user.userId, [populatedDeckName, emptyDeckName]);
  await page.setViewportSize({ width: 390, height: 844 });

  try {
    const populatedDeck = await createDeck(
      user.userId,
      populatedDeckName,
      "Mobile deck with one due card",
    );
    const emptyDeck = await createDeck(
      user.userId,
      emptyDeckName,
      "Mobile deck with no cards",
    );

    await createFlashcardForDeck(
      user.userId,
      populatedDeck.id,
      populatedDeckFront,
      populatedDeckBack,
    );

    await openFlashcardsReviewPage(page, populatedDeck.id);

    const startReviewButton = page.getByRole("button", {
      name: "Start review",
      exact: true,
    });
    await expect(startReviewButton).toBeVisible();

    const startReviewBox = await startReviewButton.boundingBox();
    expect(startReviewBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);

    const scopePicker = page.getByTestId("mobile-deck-scope-picker");
    await expect(scopePicker).toContainText(populatedDeckName);

    await scopePicker.getByRole("combobox", { name: "Deck scope" }).click();
    await page
      .locator('[data-slot="popover-content"]')
      .getByText(emptyDeckName, { exact: true })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`deckId=${escapeRegex(emptyDeck.id)}`),
    );
    await expect(scopePicker).toContainText(emptyDeckName);
    await expect(page.getByText("0 due", { exact: true })).toBeVisible();
    await expect(page.getByText("0 cards", { exact: true })).toBeVisible();
    await expect(startReviewButton).toBeDisabled();
  } finally {
    await clearUserDecksByNames(user.userId, [
      populatedDeckName,
      emptyDeckName,
    ]);
  }
});

test("mobile statistics shows compact scope picker and supports scope changes", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const populatedDeckName = getUniqueDeckName("mobile-statistics-populated");
  const emptyDeckName = getUniqueDeckName("mobile-statistics-empty");
  const populatedDeckFront = getUniqueFlashcardFront(
    "mobile-statistics-populated",
  );
  const populatedDeckBack = getUniqueFlashcardBack(
    "mobile-statistics-populated",
  );

  await clearUserDecksByNames(user.userId, [populatedDeckName, emptyDeckName]);
  await page.setViewportSize({ width: 390, height: 844 });

  try {
    const populatedDeck = await createDeck(
      user.userId,
      populatedDeckName,
      "Mobile statistics deck with one card",
    );
    const emptyDeck = await createDeck(
      user.userId,
      emptyDeckName,
      "Mobile statistics empty deck",
    );

    await createFlashcardForDeck(
      user.userId,
      populatedDeck.id,
      populatedDeckFront,
      populatedDeckBack,
    );

    await openFlashcardsStatisticsPage(page, populatedDeck.id);

    await expect(page.getByTestId("mobile-deck-scope-picker")).toContainText(
      populatedDeckName,
    );
    await expect(getDeckSidebar(page)).toBeHidden();
    await expect(page.getByTestId("flashcards-statistics")).toBeVisible();

    await page
      .getByTestId("mobile-deck-scope-picker")
      .getByRole("combobox", { name: "Deck scope" })
      .click();
    await page
      .locator('[data-slot="popover-content"]')
      .getByText(emptyDeckName, { exact: true })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`view=statistics&deckId=${escapeRegex(emptyDeck.id)}`),
    );
    await expect(page.getByTestId("mobile-deck-scope-picker")).toContainText(
      emptyDeckName,
    );
    await expect(
      page.getByText("No flashcards in this scope", { exact: true }),
    ).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [
      populatedDeckName,
      emptyDeckName,
    ]);
  }
});
