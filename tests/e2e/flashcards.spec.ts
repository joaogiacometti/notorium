import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjectsByNames,
  createFlashcard,
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
  await dialog.locator(`#${formId}-front`).fill(front);
  await dialog.locator(`#${formId}-back`).fill(back);
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
    await expect(page.getByText("No cards due right now.")).toBeVisible();

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
      page.getByRole("button", { name: "Enter Focus Mode", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Enter Focus Mode", exact: true })
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

    await expect(
      page.getByText(/due of \d+ total cards/).first(),
    ).toBeVisible();
    await expect(page.getByText(flashcardFront)).toBeVisible();
    await page
      .getByRole("button", { name: "Enter Focus Mode", exact: true })
      .click();

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
