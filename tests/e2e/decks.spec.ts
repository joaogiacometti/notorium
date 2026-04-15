import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserDecksByNames,
  createDeck,
  createFlashcardForDeck,
} from "./support/db";

function getUniqueDeckName(testTitle: string) {
  return getPrefixedValue("deck", testTitle);
}

function getUniqueFlashcardFront(testTitle: string) {
  return getPrefixedValue("deck-flashcard-front", testTitle);
}

function getUniqueFlashcardBack(testTitle: string) {
  return getPrefixedValue("deck-flashcard-back", testTitle);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function openFlashcardsPage(
  page: Page,
  view: "manage" | "review",
  deckId?: string,
) {
  const query = new URLSearchParams({ view });

  if (deckId) {
    query.set("deckId", deckId);
  }

  await page.goto(`/flashcards?${query.toString()}`);
  await expect(
    page.getByRole("heading", { name: "Flashcards", exact: true }),
  ).toBeVisible();
}

function getDeckSidebar(page: Page) {
  return page.getByRole("complementary").first();
}

function getDeckButton(sidebar: Locator, deckName: string, count: number) {
  return sidebar.getByRole("button", {
    name: new RegExp(`^${escapeRegex(deckName)}\\s*${count}$`),
  });
}

function getFocusModeDeckLabel(page: Page, deckName: string) {
  return page
    .locator("main p")
    .filter({ hasText: new RegExp(`^${escapeRegex(deckName)}$`) })
    .last();
}

function getDeckActionsButton(
  sidebar: Locator,
  deckName: string,
  count: number,
) {
  return getDeckButton(sidebar, deckName, count)
    .locator("xpath=ancestor::div[button[@aria-label='Deck actions']][1]")
    .getByRole("button", { name: "Deck actions", exact: true });
}

test("can create a deck from the flashcards sidebar", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("create");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    await openFlashcardsPage(page, "manage");

    await page.getByRole("button", { name: "New Deck", exact: true }).click();
    const createDialog = page.getByRole("dialog", { name: "Create Deck" });
    await createDialog.locator("#form-create-deck-name").fill(deckName);
    await createDialog.getByRole("button", { name: "Create" }).click();

    await expect(createDialog).toHaveCount(0);

    const sidebar = getDeckSidebar(page);
    const deckButton = getDeckButton(sidebar, deckName, 0);
    await expect(deckButton).toBeVisible();

    await deckButton.click();

    await expect(page).toHaveURL(/deckId=/);
    await expect(
      page.getByRole("button", { name: "New Flashcard", exact: true }),
    ).toBeVisible();
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can rename a deck from the flashcards sidebar", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const initialDeckName = getUniqueDeckName("edit-initial");
  const updatedDeckName = getUniqueDeckName("edit-updated");

  await clearUserDecksByNames(user.userId, [initialDeckName, updatedDeckName]);

  try {
    await createDeck(user.userId, initialDeckName);

    await openFlashcardsPage(page, "manage");

    const sidebar = getDeckSidebar(page);
    await expect(getDeckButton(sidebar, initialDeckName, 0)).toBeVisible();

    await getDeckActionsButton(sidebar, initialDeckName, 0).click();
    await page
      .getByRole("menuitem", { name: "Rename deck", exact: true })
      .click();

    const editDialog = page.getByRole("dialog", { name: "Edit Deck" });
    await editDialog.locator("#form-edit-deck-name").fill(updatedDeckName);
    await editDialog.getByRole("button", { name: "Save" }).click();

    await expect(editDialog).toHaveCount(0);
    await expect(getDeckButton(sidebar, updatedDeckName, 0)).toBeVisible();
    await expect(getDeckButton(sidebar, initialDeckName, 0)).toHaveCount(0);
  } finally {
    await clearUserDecksByNames(user.userId, [
      initialDeckName,
      updatedDeckName,
    ]);
  }
});

test("can delete a deck with flashcards from the flashcards sidebar", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const deckName = getUniqueDeckName("delete");
  const flashcardFront = getUniqueFlashcardFront("delete");

  await clearUserDecksByNames(user.userId, [deckName]);

  try {
    const createdDeck = await createDeck(user.userId, deckName);

    await createFlashcardForDeck(
      user.userId,
      createdDeck.id,
      flashcardFront,
      "Flashcard deleted with deck",
    );

    await openFlashcardsPage(page, "manage");

    const sidebar = getDeckSidebar(page);
    await expect(getDeckButton(sidebar, deckName, 1)).toBeVisible();

    await getDeckActionsButton(sidebar, deckName, 1).click();
    await page
      .getByRole("menuitem", { name: "Delete deck", exact: true })
      .click();

    const deleteDialog = page.getByRole("dialog", { name: "Delete Deck" });
    await expect(deleteDialog).toContainText(
      "1 flashcard in this deck will also be deleted.",
    );
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(getDeckButton(sidebar, deckName, 1)).toHaveCount(0);
  } finally {
    await clearUserDecksByNames(user.userId, [deckName]);
  }
});

test("can filter flashcards by deck in manage and review views", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
  const firstDeckName = getUniqueDeckName("deck-filter-first");
  const secondDeckName = getUniqueDeckName("deck-filter-second");
  const firstDeckFront = getUniqueFlashcardFront("deck-filter-first");
  const secondDeckFront = getUniqueFlashcardFront("deck-filter-second");
  const firstDeckBack = getUniqueFlashcardBack("deck-filter-first");
  const secondDeckBack = getUniqueFlashcardBack("deck-filter-second");

  await clearUserDecksByNames(user.userId, [firstDeckName, secondDeckName]);

  try {
    const firstDeck = await createDeck(user.userId, firstDeckName);
    const secondDeck = await createDeck(user.userId, secondDeckName);

    await createFlashcardForDeck(
      user.userId,
      firstDeck.id,
      firstDeckFront,
      firstDeckBack,
    );
    await createFlashcardForDeck(
      user.userId,
      secondDeck.id,
      secondDeckFront,
      secondDeckBack,
    );

    await openFlashcardsPage(page, "manage", firstDeck.id);
    await expect(
      page.getByTitle(firstDeckFront, { exact: true }),
    ).toBeVisible();
    await expect(page.getByTitle(secondDeckFront, { exact: true })).toHaveCount(
      0,
    );

    await openFlashcardsPage(page, "manage", secondDeck.id);
    await expect(
      page.getByTitle(secondDeckFront, { exact: true }),
    ).toBeVisible();
    await expect(page.getByTitle(firstDeckFront, { exact: true })).toHaveCount(
      0,
    );

    await openFlashcardsPage(page, "review", firstDeck.id);
    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Start exam", exact: true }).click();
    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(getFocusModeDeckLabel(page, firstDeckName)).toBeVisible();
    await expect(page.getByText(secondDeckFront, { exact: true })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Exit Focus Mode" }).click();

    await openFlashcardsPage(page, "review", secondDeck.id);
    await expect(
      page.getByRole("button", { name: "Start exam", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Start exam", exact: true }).click();
    await expect(page.getByText("Card 1 of 1", { exact: true })).toBeVisible();
    await expect(getFocusModeDeckLabel(page, secondDeckName)).toBeVisible();
    await expect(page.getByText(firstDeckFront, { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await clearUserDecksByNames(user.userId, [firstDeckName, secondDeckName]);
  }
});
