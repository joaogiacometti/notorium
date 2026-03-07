import { expect, test } from "@playwright/test";
import { closeE2EDb } from "../../helpers/db";
import {
  createFlashcard,
  createSubject,
  deleteFlashcardByFront,
  editFlashcardByFront,
  openFlashcardsSection,
  openSubject,
} from "../../helpers/subjects";

function uniqueValue(base: string) {
  return `${base} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe("subjects flashcards", () => {
  test.afterAll(async () => {
    await closeE2EDb();
  });

  test("creates a flashcard for a subject", async ({ page }) => {
    const subjectName = uniqueValue("E2E Subject Flashcards Create");
    const createdFront = uniqueValue("E2E Flashcard Front Created");
    const createdBack = uniqueValue("E2E Flashcard Back Created");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Flashcards create subject"),
    });

    await openSubject(page, subjectName);
    await createFlashcard(page, {
      front: createdFront,
      back: createdBack,
    });

    await openFlashcardsSection(page);
    await expect(page.getByRole("link", { name: createdFront })).toBeVisible();
    await expect(page.getByText(createdBack)).toBeVisible();
  });

  test("edits an existing flashcard", async ({ page }) => {
    const subjectName = uniqueValue("E2E Subject Flashcards Edit");
    const createdFront = uniqueValue("E2E Flashcard Front Created");
    const updatedFront = uniqueValue("E2E Flashcard Front Updated");
    const updatedBack = uniqueValue("E2E Flashcard Back Updated");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Flashcards edit subject"),
    });

    await openSubject(page, subjectName);
    await createFlashcard(page, {
      front: createdFront,
      back: uniqueValue("E2E Flashcard Back Created"),
    });
    await openFlashcardsSection(page);

    await editFlashcardByFront(page, createdFront, {
      front: updatedFront,
      back: updatedBack,
    });

    await expect(page.getByRole("link", { name: updatedFront })).toBeVisible();
    await expect(page.getByText(updatedBack)).toBeVisible();
  });

  test("deletes a flashcard", async ({ page }) => {
    const subjectName = uniqueValue("E2E Subject Flashcards Delete");
    const createdFront = uniqueValue("E2E Flashcard Front Created");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Flashcards delete subject"),
    });

    await openSubject(page, subjectName);
    await createFlashcard(page, {
      front: createdFront,
      back: uniqueValue("E2E Flashcard Back Created"),
    });
    await openFlashcardsSection(page);

    await deleteFlashcardByFront(page, createdFront);
    await expect(page.getByRole("link", { name: createdFront })).toHaveCount(0);
    await expect(page.getByText("No flashcards yet")).toBeVisible();
  });
});
