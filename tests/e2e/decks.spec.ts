import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjectsByNames,
  createDeck,
  createFlashcard,
  createMaxDecksForSubject,
  createSubject,
  getDefaultDeckForSubject,
} from "./support/db";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("deck-subject", testTitle);
}

function getUniqueDeckName(testTitle: string) {
  return getPrefixedValue("deck-name", testTitle);
}

function getUniqueDeckDescription(testTitle: string) {
  return getPrefixedValue("deck-description", testTitle);
}

async function openSubjectPage(page: Page, subjectId: string) {
  await page.goto(`/subjects/${subjectId}`);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

test("can create a custom deck", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("create-deck");
  const deckName = getUniqueDeckName("create-deck");
  const deckDescription = getUniqueDeckDescription("create-deck");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck create test",
    );

    await openSubjectPage(page, createdSubject.id);

    await page.getByRole("button", { name: "New Deck" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create Deck" });
    await createDialog.locator("#form-create-deck-name").fill(deckName);
    await createDialog
      .locator("#form-create-deck-description")
      .fill(deckDescription);
    await createDialog.getByRole("button", { name: "Create Deck" }).click();

    await expect(createDialog).toHaveCount(0);
    await expect(page.getByText(deckName)).toBeVisible();
    await expect(page.getByText(deckDescription)).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can edit a deck", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("edit-deck");
  const initialName = getUniqueDeckName("edit-initial");
  const initialDescription = getUniqueDeckDescription("edit-initial");
  const updatedName = getUniqueDeckName("edit-updated");
  const updatedDescription = getUniqueDeckDescription("edit-updated");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck edit test",
    );

    await createDeck(
      user.userId,
      createdSubject.id,
      initialName,
      initialDescription,
    );

    await openSubjectPage(page, createdSubject.id);

    await expect(page.getByText(initialName)).toBeVisible();

    const deckCard = page.getByTestId("deck-card").filter({
      hasText: initialName,
    });
    await deckCard.getByRole("button", { name: "Edit" }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit Deck" });
    await editDialog.locator("#form-edit-deck-name").fill(updatedName);
    await editDialog
      .locator("#form-edit-deck-description")
      .fill(updatedDescription);
    await editDialog.getByRole("button", { name: "Save" }).click();

    await expect(editDialog).toHaveCount(0);
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(updatedDescription)).toBeVisible();
    await expect(page.getByText(initialName)).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can delete a non-default deck", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("delete-deck");
  const deckName = getUniqueDeckName("delete-deck");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck delete test",
    );

    await createDeck(user.userId, createdSubject.id, deckName, null);

    await openSubjectPage(page, createdSubject.id);

    await expect(page.getByText(deckName)).toBeVisible();

    const deckCard = page.getByTestId("deck-card").filter({
      hasText: deckName,
    });
    await deckCard.getByRole("button", { name: "Delete" }).click();

    const deleteDialog = page.getByRole("dialog", { name: "Delete Deck" });
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(page.getByText(deckName)).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("cannot delete default deck", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("delete-default");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck delete default test",
    );

    await createFlashcard(
      user.userId,
      createdSubject.id,
      "Front text",
      "Back text",
    );

    await openSubjectPage(page, createdSubject.id);

    await expect(page.getByText("General")).toBeVisible();

    const defaultDeckCard = page.getByTestId("deck-card").filter({
      hasText: "General",
    });

    await expect(
      defaultDeckCard.getByRole("button", { name: "Delete" }),
    ).toBeDisabled();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("flashcards move to default deck when custom deck is deleted", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("move-flashcards");
  const deckName = getUniqueDeckName("move-flashcards");
  const flashcardFront = "Test flashcard front";
  const flashcardBack = "Test flashcard back";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Flashcard move test",
    );

    const defaultDeck = await getDefaultDeckForSubject(
      user.userId,
      createdSubject.id,
    );

    if (!defaultDeck) {
      await createFlashcard(
        user.userId,
        createdSubject.id,
        "Trigger default deck",
        "Back",
      );
    }

    await createDeck(user.userId, createdSubject.id, deckName, null);

    await page.goto(`/flashcards?view=manage&subjectId=${createdSubject.id}`);
    await page.getByRole("button", { name: "New Flashcard" }).click();

    const createDialog = page.getByRole("dialog", { name: "Create Flashcard" });
    await createDialog
      .locator("#form-create-flashcard-front")
      .fill(flashcardFront);
    await createDialog
      .locator("#form-create-flashcard-back")
      .fill(flashcardBack);
    await createDialog.getByRole("combobox", { name: "Deck" }).click();
    await page.getByRole("option", { name: deckName }).click();
    await createDialog
      .getByRole("button", { name: "Create Flashcard" })
      .click();

    await expect(createDialog).toHaveCount(0);

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: deckName }).click();

    await expect(page.getByTitle(flashcardFront)).toBeVisible();

    await openSubjectPage(page, createdSubject.id);

    const deckCard = page.getByTestId("deck-card").filter({
      hasText: deckName,
    });
    await expect(deckCard.getByText("1 flashcard")).toBeVisible();

    await deckCard.getByRole("button", { name: "Delete" }).click();

    const deleteDialog = page.getByRole("dialog", { name: "Delete Deck" });
    await expect(
      deleteDialog.getByText(/1 flashcard will be moved to the default deck/i),
    ).toBeVisible();
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(page.getByText(deckName)).toHaveCount(0);

    await page.goto(`/flashcards?view=manage&subjectId=${createdSubject.id}`);
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "General" }).click();

    await expect(page.getByTitle(flashcardFront)).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("shows deck limit warning when subject deck limit is reached", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("deck-limit");
  const attemptedDeckName = getUniqueDeckName("deck-limit-attempt");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck limit test",
    );

    await createMaxDecksForSubject(user.userId, createdSubject.id);

    await openSubjectPage(page, createdSubject.id);

    await page.getByRole("button", { name: "New Deck" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create Deck" });
    await createDialog
      .locator("#form-create-deck-name")
      .fill(attemptedDeckName);
    await createDialog.getByRole("button", { name: "Create Deck" }).click();

    await expect(
      page.getByText(/system limit reached: you can have up to .* decks/i),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can filter flashcards by deck", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("filter-by-deck");
  const deck1Name = getUniqueDeckName("filter-deck-1");
  const deck2Name = getUniqueDeckName("filter-deck-2");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Deck filter test",
    );

    await createDeck(user.userId, createdSubject.id, deck1Name, null);
    await createDeck(user.userId, createdSubject.id, deck2Name, null);

    await page.goto(`/flashcards?view=manage&subjectId=${createdSubject.id}`);

    await page.getByRole("button", { name: "New Flashcard" }).click();
    let createDialog = page.getByRole("dialog", { name: "Create Flashcard" });
    await createDialog
      .locator("#form-create-flashcard-front")
      .fill("Deck 1 Front");
    await createDialog
      .locator("#form-create-flashcard-back")
      .fill("Deck 1 Back");
    await createDialog.getByRole("combobox", { name: "Deck" }).click();
    await page.getByRole("option", { name: deck1Name }).click();
    await createDialog
      .getByRole("button", { name: "Create Flashcard" })
      .click();
    await expect(createDialog).toHaveCount(0);

    await page.getByRole("button", { name: "New Flashcard" }).click();
    createDialog = page.getByRole("dialog", { name: "Create Flashcard" });
    await createDialog
      .locator("#form-create-flashcard-front")
      .fill("Deck 2 Front");
    await createDialog
      .locator("#form-create-flashcard-back")
      .fill("Deck 2 Back");
    await createDialog.getByRole("combobox", { name: "Deck" }).click();
    await page.getByRole("option", { name: deck2Name }).click();
    await createDialog
      .getByRole("button", { name: "Create Flashcard" })
      .click();
    await expect(createDialog).toHaveCount(0);

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: deck1Name }).click();

    await expect(page.getByTitle("Deck 1 Front")).toBeVisible();
    await expect(page.getByTitle("Deck 2 Front")).toHaveCount(0);

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: deck2Name }).click();

    await expect(page.getByTitle("Deck 2 Front")).toBeVisible();
    await expect(page.getByTitle("Deck 1 Front")).toHaveCount(0);

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "All decks" }).click();

    await expect(page.getByTitle("Deck 1 Front")).toBeVisible();
    await expect(page.getByTitle("Deck 2 Front")).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
