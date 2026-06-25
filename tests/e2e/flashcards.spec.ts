import type { Locator, Page } from "@playwright/test";
import { PLAYWRIGHT_GENERATED_BACK } from "@/features/flashcards/ai";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import { clearUserSubjectsByNames, createSubject } from "./support/db";
import { createFlashcardForSubject } from "./support/flashcards";
import { breadcrumbCurrent } from "./support/page-chrome";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("flashcard-subject", testTitle);
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

async function openFlashcardsManagePage(page: Page, subjectId?: string) {
  const query = new URLSearchParams({ view: "manage" });
  if (subjectId) query.set("subjectId", subjectId);

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
}

async function openFlashcardsReviewPage(page: Page, subjectId?: string) {
  const query = new URLSearchParams({ view: "review" });
  if (subjectId) query.set("subjectId", subjectId);

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
}

function getFocusModeSubjectLabel(page: Page, subjectName: string) {
  return page
    .locator("main p")
    .filter({ hasText: new RegExp(`^${escapeRegex(subjectName)}$`) })
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

  return page.getByRole("dialog", { name: "Create Flashcard" });
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

test("can create and open a flashcard", async ({ page, e2eUser }) => {
  const subjectName = getUniqueSubjectName("create-open");
  const flashcardFront = getUniqueFlashcardFront("create-open");
  const flashcardBack = getUniqueFlashcardBack("create-open");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);

    await openFlashcardsManagePage(page, subject.id);
    await createFlashcardFromManageDialog(page, flashcardFront, flashcardBack);

    await openFlashcardDetailFromManage(page, flashcardFront);
    await expect(page.getByText("Front", { exact: true })).toBeVisible();
    await expect(page.getByText("Back", { exact: true })).toBeVisible();
    await expect(breadcrumbCurrent(page, subjectName)).toBeVisible();
    await expect(page.getByText(flashcardBack).first()).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can generate a single flashcard back with AI", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getUniqueSubjectName("ai-single-back");
  const flashcardFront = getUniqueFlashcardFront("ai-single-back");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);

    await openFlashcardsManagePage(page, subject.id);
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
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can validate flashcards with AI", async ({ page, e2eUser }) => {
  const subjectName = getUniqueSubjectName("ai-validation");
  const issueFront = getUniqueFlashcardFront("ai-validation-fixture issue");
  const cleanFront = getUniqueFlashcardFront("ai-validation-clean");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);
    await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
      issueFront,
      "Too vague.",
    );
    await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
      cleanFront,
      "Specific enough for validation.",
    );

    await openFlashcardsManagePage(page, subject.id);
    await page.getByRole("button", { name: "AI tools" }).click();
    await page.getByRole("menuitem", { name: "Validate cards" }).click();

    const validateDialog = page.getByRole("dialog", {
      name: "Validate Flashcards",
    });
    await expect(
      validateDialog.getByText("the selected subject"),
    ).toBeVisible();
    await validateDialog
      .getByRole("button", { name: "Validate", exact: true })
      .click();

    await expect(page.getByText("Confusing", { exact: true })).toBeVisible();
    await expect(page.getByTitle(issueFront, { exact: true })).toBeVisible();
    await expect(
      page.getByText(subjectName, { exact: true }).first(),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can edit a flashcard", async ({ page, e2eUser }) => {
  const subjectName = getUniqueSubjectName("edit");
  const initialFront = getUniqueFlashcardFront("edit-initial");
  const initialBack = getUniqueFlashcardBack("edit-initial");
  const updatedFront = getUniqueFlashcardFront("edit-updated");
  const updatedBack = getUniqueFlashcardBack("edit-updated");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);
    const flashcard = await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
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
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can delete a flashcard", async ({ page, e2eUser }) => {
  const subjectName = getUniqueSubjectName("delete");
  const flashcardFront = getUniqueFlashcardFront("delete");
  const flashcardBack = getUniqueFlashcardBack("delete");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);
    const flashcard = await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
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
    await openFlashcardsManagePage(page, subject.id);
    await expect(page.getByText(flashcardFront, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can switch between subject-scoped flashcards views", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getUniqueSubjectName("view-switch");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);

    await openFlashcardsReviewPage(page, subject.id);
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
    await expect(page).toHaveURL(new RegExp(`subjectId=${subject.id}`));
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can search subject-scoped manage flashcards without hanging", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getUniqueSubjectName("manage-search");
  const matchingFront = getUniqueFlashcardFront("manage-search-match");
  const matchingBack = getUniqueFlashcardBack("manage-search-match");
  const otherFront = getUniqueFlashcardFront("manage-search-other");
  const otherBack = getUniqueFlashcardBack("manage-search-other");
  const searchTerm = "manage-search-match";

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);
    await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
      matchingFront,
      matchingBack,
    );
    await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
      otherFront,
      otherBack,
    );

    await openFlashcardsManagePage(page, subject.id);
    await page
      .getByPlaceholder("Search front, back, or subject path...")
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
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can enter and exit Focus Mode", async ({ page, e2eUser }) => {
  const subjectName = getUniqueSubjectName("focus-mode");
  const flashcardFront = getUniqueFlashcardFront("focus-mode");
  const flashcardBack = getUniqueFlashcardBack("focus-mode");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);
    await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
      flashcardFront,
      flashcardBack,
    );

    await openFlashcardsReviewPage(page, subject.id);
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(
      page.getByText(/due of \d+ total cards/).first(),
    ).toBeVisible();
    await expect(getFocusModeSubjectLabel(page, subjectName)).toBeVisible();
    await expect(page.getByText(flashcardFront)).toBeVisible();

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();
    await expect(breadcrumbCurrent(page, "Flashcards")).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("can complete a review in Focus Mode", async ({ page, e2eUser }) => {
  const subjectName = getUniqueSubjectName("focus-review");
  const flashcardFront = getUniqueFlashcardFront("focus-review");
  const flashcardBack = getUniqueFlashcardBack("focus-review");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const subject = await createSubject(e2eUser.userId, subjectName);
    await createFlashcardForSubject(
      e2eUser.userId,
      subject.id,
      flashcardFront,
      flashcardBack,
    );

    await openFlashcardsReviewPage(page, subject.id);
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();

    await expect(page.getByText(flashcardFront)).toBeVisible();
    await page.getByRole("button", { name: "Show answer" }).click();
    await expect(page.getByText(flashcardBack)).toBeVisible();
    await page.getByRole("button", { name: /Easy/i }).click();

    await expect(page.getByText("All caught up")).toBeVisible();
    await expect(
      page.getByText("No due flashcards in this scope right now."),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("review and exam actions respect subject scope", async ({
  page,
  e2eUser,
}) => {
  const dueSubjectName = getUniqueSubjectName("scope-actions-due");
  const examSubjectName = getUniqueSubjectName("scope-actions-exam-only");
  const dueFront = getUniqueFlashcardFront("scope-actions-due");
  const dueBack = getUniqueFlashcardBack("scope-actions-due");
  const examFront = getUniqueFlashcardFront("scope-actions-exam-only");
  const examBack = getUniqueFlashcardBack("scope-actions-exam-only");

  await clearUserSubjectsByNames(e2eUser.userId, [
    dueSubjectName,
    examSubjectName,
  ]);

  try {
    const dueSubject = await createSubject(e2eUser.userId, dueSubjectName);
    const examSubject = await createSubject(e2eUser.userId, examSubjectName);
    await createFlashcardForSubject(
      e2eUser.userId,
      dueSubject.id,
      dueFront,
      dueBack,
    );
    await createFlashcardForSubject(
      e2eUser.userId,
      examSubject.id,
      examFront,
      examBack,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    await openFlashcardsReviewPage(page, dueSubject.id);
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();
    await expect(page.getByText(dueFront, { exact: true })).toBeVisible();
    await expect(page.getByText(examFront, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Exit Focus Mode" }).click();
    await openFlashcardsReviewPage(page, examSubject.id);
    await page.getByRole("button", { name: "Start exam", exact: true }).click();
    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(getFocusModeSubjectLabel(page, examSubjectName)).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [
      dueSubjectName,
      examSubjectName,
    ]);
  }
});
