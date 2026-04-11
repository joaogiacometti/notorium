import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjectsByNames,
  createDeck,
  createFlashcardInDeck,
  createSubject,
  getDefaultDeckForSubject,
} from "./support/db";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("deck-subject", testTitle);
}

function getUniqueDeckName(testTitle: string) {
  return getPrefixedValue("deck", testTitle);
}

function getUniqueFlashcardFront(testTitle: string) {
  return getPrefixedValue("deck-flashcard-front", testTitle);
}

function getUniqueFlashcardBack(testTitle: string) {
  return getPrefixedValue("deck-flashcard-back", testTitle);
}

async function openSubjectDetailByName(page: Page, subjectName: string) {
  await page.goto("/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  const subjectLink = page
    .getByRole("link", { name: subjectName, exact: true })
    .first();

  await expect(subjectLink).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/subjects\/[^/]+$/),
    subjectLink.click(),
  ]);
  await expect(
    page.getByRole("heading", { name: subjectName, exact: true }),
  ).toBeVisible();
}

async function openFlashcardsPage(
  page: Page,
  view: "manage" | "review",
  subjectId: string,
  deckId?: string,
) {
  const query = new URLSearchParams({
    view,
    subjectId,
  });

  if (deckId) {
    query.set("deckId", deckId);
  }

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(
    page.getByRole("heading", { name: "Flashcards", exact: true }),
  ).toBeVisible();
}

test("can create a deck from subject detail", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("create");
  const deckName = getUniqueDeckName("create");
  const deckDescription = "Deck created from subject detail page";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    await createSubject(user.userId, subjectName, "Deck create smoke test");
    await openSubjectDetailByName(page, subjectName);

    await page.getByRole("button", { name: "New Deck", exact: true }).click();
    const createDialog = page.getByRole("dialog", { name: "Create Deck" });
    await createDialog.locator("#form-create-deck-name").fill(deckName);
    await createDialog
      .locator("#form-create-deck-description")
      .fill(deckDescription);
    await createDialog.getByRole("button", { name: "Create" }).click();

    await expect(createDialog).toHaveCount(0);

    const deckCard = page
      .getByTestId("deck-card")
      .filter({ hasText: deckName })
      .first();
    await expect(deckCard).toBeVisible();
    await expect(deckCard).toContainText(deckDescription);

    const manageLink = deckCard.getByRole("link").first();
    const href = await manageLink.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href ?? "").toContain("view=manage");
    expect(href ?? "").toContain("deckId=");

    await Promise.all([page.waitForURL(/\/flashcards\?/), manageLink.click()]);
    await expect(
      page.getByRole("heading", { name: "Flashcards", exact: true }),
    ).toBeVisible();
    expect(page.url()).toContain("view=manage");
    expect(page.url()).toContain("deckId=");
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can edit a deck from subject detail", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("edit");
  const initialDeckName = getUniqueDeckName("edit-initial");
  const updatedDeckName = getUniqueDeckName("edit-updated");
  const updatedDescription = "Updated deck description for e2e coverage";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck edit smoke test",
    );

    await createDeck(
      user.userId,
      createdSubject.id,
      initialDeckName,
      "Initial deck description",
    );

    await openSubjectDetailByName(page, subjectName);

    const deckCard = page
      .getByTestId("deck-card")
      .filter({ hasText: initialDeckName })
      .first();
    await expect(deckCard).toBeVisible();

    await deckCard.getByRole("button", { name: "Open deck actions" }).click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit Deck" });
    await editDialog.locator("#form-edit-deck-name").fill(updatedDeckName);
    await editDialog
      .locator("#form-edit-deck-description")
      .fill(updatedDescription);
    await editDialog.getByRole("button", { name: "Save" }).click();

    await expect(editDialog).toHaveCount(0);

    const updatedDeckCard = page
      .getByTestId("deck-card")
      .filter({ hasText: updatedDeckName })
      .first();
    await expect(updatedDeckCard).toBeVisible();
    await expect(updatedDeckCard).toContainText(updatedDescription);
    await expect(
      page.getByTestId("deck-card").filter({ hasText: initialDeckName }),
    ).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can delete a deck and move flashcards to default deck", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("delete");
  const deckName = getUniqueDeckName("delete");
  const flashcardFront = getUniqueFlashcardFront("delete");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck delete smoke test",
    );

    const createdDeck = await createDeck(
      user.userId,
      createdSubject.id,
      deckName,
      "Deck to be deleted",
    );

    await createFlashcardInDeck(
      user.userId,
      createdSubject.id,
      createdDeck.id,
      flashcardFront,
      "Flashcard moved to default deck",
    );

    const defaultDeck = await getDefaultDeckForSubject(
      user.userId,
      createdSubject.id,
    );

    if (!defaultDeck) {
      throw new Error("Expected default deck for test subject.");
    }

    await openSubjectDetailByName(page, subjectName);

    const deckCard = page
      .getByTestId("deck-card")
      .filter({ hasText: deckName })
      .first();

    await expect(deckCard).toBeVisible();
    await expect(deckCard).toContainText("1 flashcard");

    await deckCard.getByRole("button", { name: "Open deck actions" }).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();

    const deleteDialog = page.getByRole("dialog", { name: "Delete Deck" });
    await expect(deleteDialog).toContainText(
      "1 flashcard will be moved to the default deck.",
    );
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(
      page.getByTestId("deck-card").filter({ hasText: deckName }),
    ).toHaveCount(0);

    const defaultDeckCard = page
      .getByTestId("deck-card")
      .filter({ hasText: defaultDeck.name })
      .first();
    await expect(defaultDeckCard).toBeVisible();
    await expect(defaultDeckCard).toContainText("1 flashcard");
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("default deck does not expose deck actions", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("default-protection");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Default deck protection test",
    );

    const defaultDeck = await getDefaultDeckForSubject(
      user.userId,
      createdSubject.id,
    );

    if (!defaultDeck) {
      throw new Error("Expected default deck for test subject.");
    }

    await openSubjectDetailByName(page, subjectName);

    const defaultDeckCard = page
      .getByTestId("deck-card")
      .filter({ hasText: defaultDeck.name })
      .first();
    await expect(defaultDeckCard).toBeVisible();
    await expect(
      defaultDeckCard.getByRole("button", { name: "Open deck actions" }),
    ).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can filter flashcards by deck in manage and review views", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("deck-filter");
  const firstDeckName = getUniqueDeckName("deck-filter-first");
  const secondDeckName = getUniqueDeckName("deck-filter-second");
  const firstDeckFront = getUniqueFlashcardFront("deck-filter-first");
  const secondDeckFront = getUniqueFlashcardFront("deck-filter-second");
  const firstDeckBack = getUniqueFlashcardBack("deck-filter-first");
  const secondDeckBack = getUniqueFlashcardBack("deck-filter-second");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck filter smoke test",
    );

    const firstDeck = await createDeck(
      user.userId,
      createdSubject.id,
      firstDeckName,
      "First filter deck",
    );
    const secondDeck = await createDeck(
      user.userId,
      createdSubject.id,
      secondDeckName,
      "Second filter deck",
    );

    await createFlashcardInDeck(
      user.userId,
      createdSubject.id,
      firstDeck.id,
      firstDeckFront,
      firstDeckBack,
    );
    await createFlashcardInDeck(
      user.userId,
      createdSubject.id,
      secondDeck.id,
      secondDeckFront,
      secondDeckBack,
    );

    await openFlashcardsPage(page, "manage", createdSubject.id, firstDeck.id);
    await expect(
      page.getByTitle(firstDeckFront, { exact: true }),
    ).toBeVisible();
    await expect(page.getByTitle(secondDeckFront, { exact: true })).toHaveCount(
      0,
    );

    await openFlashcardsPage(page, "manage", createdSubject.id, secondDeck.id);
    await expect(
      page.getByTitle(secondDeckFront, { exact: true }),
    ).toBeVisible();
    await expect(page.getByTitle(firstDeckFront, { exact: true })).toHaveCount(
      0,
    );

    await openFlashcardsPage(page, "review", createdSubject.id, firstDeck.id);
    await expect(page.getByText(firstDeckFront, { exact: true })).toBeVisible();
    await expect(page.getByText(secondDeckFront, { exact: true })).toHaveCount(
      0,
    );

    await openFlashcardsPage(page, "review", createdSubject.id, secondDeck.id);
    await expect(
      page.getByText(secondDeckFront, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(firstDeckFront, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
