import { expect, type Locator, type Page, test } from "@playwright/test";
import { LIMITS } from "@/lib/config/limits";
import {
  clearUserSubjectsByNames,
  createFlashcard,
  createMaxFlashcardsForSubject,
  createSubject,
  ensureApprovedE2EUser,
} from "./support/db";

function getUniqueSubjectName(testTitle: string) {
  return `E2E Flashcards ${testTitle} ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getUniqueFlashcardFront(testTitle: string) {
  return `FC-${testTitle}-${Math.random().toString(36).slice(2, 6)}`;
}

function getUniqueFlashcardBack(testTitle: string) {
  return `Back ${testTitle} ${Math.random().toString(36).slice(2, 7)}`;
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
  front: string,
  back: string,
) {
  const editors = dialog.locator(".ProseMirror");
  await editors.nth(0).fill(front);
  await editors.nth(1).fill(back);
}

async function createFlashcardFromManageDialog(
  page: Page,
  front: string,
  back: string,
) {
  await page.getByRole("button", { name: "New Flashcard" }).click();
  const createDialog = page.getByRole("dialog", { name: "Create Flashcard" });
  await fillFlashcardEditors(createDialog, front, back);
  await createDialog.getByRole("button", { name: "Create Flashcard" }).click();

  await page.keyboard.press("Escape");
  await expect(createDialog).toHaveCount(0);
  await expect(page.getByText(front, { exact: true }).first()).toBeVisible();
}

async function openFlashcardDetailFromManage(page: Page, front: string) {
  const row = page.getByText(front, { exact: true }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(
    page.getByRole("heading", { name: front, exact: true }),
  ).toBeVisible();
}

test("can create and open a flashcard", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
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

test("can edit a flashcard", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
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
    await fillFlashcardEditors(editDialog, updatedFront, updatedBack);
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

test("can delete a flashcard", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
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

test("shows flashcard limit warning when subject limit is reached", async ({
  page,
}) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("limit");
  const attemptedFront = getUniqueFlashcardFront("limit-attempt");
  const attemptedBack = getUniqueFlashcardBack("limit-attempt");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Flashcards limit smoke test",
    );

    await createMaxFlashcardsForSubject(user.userId, createdSubject.id);

    await openFlashcardsManagePage(page, createdSubject.id);

    await expect(
      page.getByText(
        `${LIMITS.maxFlashcardsPerSubject}/${LIMITS.maxFlashcardsPerSubject} flashcards in this subject`,
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "New Flashcard" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create Flashcard" });
    await fillFlashcardEditors(createDialog, attemptedFront, attemptedBack);
    await createDialog
      .getByRole("button", { name: "Create Flashcard" })
      .click();

    await expect(
      page.getByText(/system limit reached: you can have up to .* flashcards/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        `${LIMITS.maxFlashcardsPerSubject}/${LIMITS.maxFlashcardsPerSubject} flashcards in this subject`,
      ),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can switch between global flashcards views", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
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
    await expect(page.getByText("No cards due right now.")).toBeVisible();

    await page.getByRole("tab", { name: "Manage", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "New Flashcard" }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
