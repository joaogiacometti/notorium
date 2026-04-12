import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjectsByNames,
  createDeck,
  createFlashcard,
  createFlashcardInDeck,
  createSubject,
} from "./support/db";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("flashcard-subject", testTitle);
}

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
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function openFlashcardsManagePage(page: Page, subjectId?: string) {
  const query = new URLSearchParams();
  query.set("view", "manage");

  if (subjectId) {
    query.set("subjectId", subjectId);
  }

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(
    page.getByRole("heading", { name: "Flashcards", exact: true }),
  ).toBeVisible();
}

async function fillFlashcardEditors(
  dialog: Locator,
  formId: "form-create-flashcard" | "form-edit-flashcard",
  front: string,
  back: string,
) {
  const frontEditor = dialog.locator(`#${formId}-front`);
  await expect(frontEditor).toBeVisible();
  await frontEditor.click();
  await frontEditor.press("Control+A");
  await frontEditor.press("Backspace");
  await frontEditor.pressSequentially(front);

  const backEditor = dialog.locator(`#${formId}-back`);
  await expect(backEditor).toBeVisible();
  await backEditor.click();
  await backEditor.press("Control+A");
  await backEditor.press("Backspace");
  await backEditor.pressSequentially(back);
}

async function createFlashcardFromManageDialog(
  page: Page,
  front: string,
  back: string,
) {
  await page.getByRole("button", { name: "New Flashcard" }).click();
  const createDialog = page.getByRole("dialog", { name: "Create Flashcard" });
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
  await frontPreview.click();
  await expect(
    page.getByRole("heading", { name: front, exact: true }),
  ).toBeVisible();
}

test("can create and open a flashcard", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("create-open");
  const flashcardFront = getUniqueFlashcardFront("create-open");
  const flashcardBack = getUniqueFlashcardBack("create-open");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Flashcards create smoke test",
    );

    await openFlashcardsManagePage(page, createdSubject.id);
    await createFlashcardFromManageDialog(page, flashcardFront, flashcardBack);

    await openFlashcardDetailFromManage(page, flashcardFront);
    await expect(page.getByText("Front", { exact: true })).toBeVisible();
    await expect(page.getByText("Back", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: flashcardFront, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(flashcardBack).first()).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can edit a flashcard", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("edit");
  const initialFront = getUniqueFlashcardFront("edit-initial");
  const initialBack = getUniqueFlashcardBack("edit-initial");
  const updatedFront = getUniqueFlashcardFront("edit-updated");
  const updatedBack = getUniqueFlashcardBack("edit-updated");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Flashcards edit smoke test",
    );

    const createdFlashcard = await createFlashcard(
      user.userId,
      createdSubject.id,
      initialFront,
      initialBack,
    );

    await page.goto(
      `/subjects/${createdSubject.id}/flashcards/${createdFlashcard.id}`,
    );
    await expect(
      page.getByRole("heading", { name: initialFront, exact: true }),
    ).toBeVisible();

    await page
      .getByRole("main")
      .getByRole("button", { name: "Edit", exact: true })
      .click();

    const editDialog = page.getByRole("dialog", { name: "Edit Flashcard" });
    await fillFlashcardEditors(
      editDialog,
      "form-edit-flashcard",
      updatedFront,
      updatedBack,
    );
    await editDialog.getByRole("button", { name: "Save Changes" }).click();

    await expect(editDialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: updatedFront, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(updatedBack).first()).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can delete a flashcard", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("delete");
  const flashcardFront = getUniqueFlashcardFront("delete");
  const flashcardBack = getUniqueFlashcardBack("delete");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Flashcards delete smoke test",
    );

    const createdFlashcard = await createFlashcard(
      user.userId,
      createdSubject.id,
      flashcardFront,
      flashcardBack,
    );

    await page.goto(
      `/subjects/${createdSubject.id}/flashcards/${createdFlashcard.id}`,
    );
    await expect(
      page.getByRole("heading", { name: flashcardFront, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete Flashcard" });
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: subjectName, exact: true }),
    ).toBeVisible();
    await openFlashcardsManagePage(page, createdSubject.id);
    await expect(page.getByText(flashcardFront, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can switch between global flashcards views", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("view-switch");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Flashcards view switch smoke test",
    );

    await page.goto(`/flashcards?view=review&subjectId=${createdSubject.id}`);

    await expect(
      page.getByRole("heading", { name: "Flashcards", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeDisabled();

    await page.getByRole("tab", { name: "Manage", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "New Flashcard" }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can enter and exit Focus Mode", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("focus-mode");
  const flashcardFront = getUniqueFlashcardFront("focus-mode");
  const flashcardBack = getUniqueFlashcardBack("focus-mode");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Focus Mode smoke test",
    );

    await createFlashcard(
      user.userId,
      createdSubject.id,
      flashcardFront,
      flashcardBack,
    );

    await page.goto(`/flashcards?view=review&subjectId=${createdSubject.id}`);

    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(
      page.getByText(/due of \d+ total cards/).first(),
    ).toBeVisible();
    await expect(page.getByText(flashcardFront)).toBeVisible();

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();

    await expect(
      page.getByRole("heading", { name: "Flashcards", exact: true }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can complete a review in Focus Mode", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("focus-review");
  const flashcardFront = getUniqueFlashcardFront("focus-review");
  const flashcardBack = getUniqueFlashcardBack("focus-review");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Focus Mode review smoke test",
    );

    await createFlashcard(
      user.userId,
      createdSubject.id,
      flashcardFront,
      flashcardBack,
    );

    await page.goto(`/flashcards?view=review&subjectId=${createdSubject.id}`);

    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(page.getByText(flashcardFront)).toBeVisible();
    await page.getByRole("button", { name: "Show Answer" }).click();

    await expect(page.getByText(flashcardBack)).toBeVisible();
    await expect(page.getByRole("button", { name: /Good/i })).toBeVisible();

    await page.getByRole("button", { name: /Good/i }).click();

    await expect(page.getByText("All caught up!")).toBeVisible();
    await expect(
      page.getByText("There are no due flashcards to review."),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can start exam mode from review hub on first click", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("exam-start");
  const flashcardFront = getUniqueFlashcardFront("exam-start");
  const flashcardBack = getUniqueFlashcardBack("exam-start");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Exam start smoke test",
    );

    await createFlashcard(
      user.userId,
      createdSubject.id,
      flashcardFront,
      flashcardBack,
    );

    await page.goto(`/flashcards?view=review&subjectId=${createdSubject.id}`);

    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start exam", exact: true }).click();

    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Front", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(`${escapeRegex(subjectName)}\\s*·`)),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show Answer", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();
    await expect(
      page.getByRole("heading", { name: "Flashcards", exact: true }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("review and exam actions respect deck scope", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("scope-actions");
  const dueDeckName = getUniqueDeckName("scope-actions-due");
  const examOnlyDeckName = getUniqueDeckName("scope-actions-exam-only");
  const dueDeckFront = getUniqueFlashcardFront("scope-actions-due");
  const dueDeckBack = getUniqueFlashcardBack("scope-actions-due");
  const examDeckFront = getUniqueFlashcardFront("scope-actions-exam-only");
  const examDeckBack = getUniqueFlashcardBack("scope-actions-exam-only");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Review and exam scope smoke test",
    );

    const dueDeck = await createDeck(
      user.userId,
      createdSubject.id,
      dueDeckName,
      "Deck with due cards",
    );
    const examOnlyDeck = await createDeck(
      user.userId,
      createdSubject.id,
      examOnlyDeckName,
      "Deck with cards not due yet",
    );

    await createFlashcardInDeck(
      user.userId,
      createdSubject.id,
      dueDeck.id,
      dueDeckFront,
      dueDeckBack,
    );

    await createFlashcardInDeck(
      user.userId,
      createdSubject.id,
      examOnlyDeck.id,
      examDeckFront,
      examDeckBack,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );

    await page.goto(
      `/flashcards?view=review&subjectId=${createdSubject.id}&deckId=${dueDeck.id}`,
    );

    await expect(
      page.getByRole("button", { name: "Start review", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(page.getByText(dueDeckFront, { exact: true })).toBeVisible();
    await expect(page.getByText(examDeckFront, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();
    await expect(
      page.getByRole("heading", { name: "Flashcards", exact: true }),
    ).toBeVisible();

    await page.goto(
      `/flashcards?view=review&subjectId=${createdSubject.id}&deckId=${examOnlyDeck.id}`,
    );

    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeEnabled();

    await page.getByRole("button", { name: "Start exam", exact: true }).click();

    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        new RegExp(
          `${escapeRegex(subjectName)}\\s*·\\s*${escapeRegex(examOnlyDeckName)}`,
        ),
      ),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
