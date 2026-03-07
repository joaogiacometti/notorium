import { expect, test } from "@playwright/test";
import { e2eSubjectsUser } from "../../helpers/constants";
import { closeE2EDb, seedFlashcardReviewSubject } from "../../helpers/db";

function uniqueValue(base: string) {
  return `${base} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe("flashcards review", () => {
  test.afterAll(async () => {
    await closeE2EDb();
  });

  test("shows the empty state when there are no due flashcards", async ({
    page,
  }) => {
    const { subjectId } = await seedFlashcardReviewSubject(
      e2eSubjectsUser.email,
      {
        name: uniqueValue("E2E Empty Review Subject"),
        description: uniqueValue("Empty review subject description"),
        flashcards: [],
      },
    );

    await page.goto(`/en/flashcards/review?subjectId=${subjectId}`);

    await expect(
      page.getByRole("heading", { name: "Flashcard Review", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("No cards due right now.")).toBeVisible();
    await expect(page.getByText("All caught up")).toBeVisible();
    await expect(
      page.getByText("There are no due flashcards to review."),
    ).toBeVisible();
  });

  test("reviews a due flashcard and refreshes the queue state", async ({
    page,
  }) => {
    const front = uniqueValue("E2E Review Front");
    const back = uniqueValue("E2E Review Back");

    const { subjectId } = await seedFlashcardReviewSubject(
      e2eSubjectsUser.email,
      {
        name: uniqueValue("E2E Review Subject"),
        description: uniqueValue("Review subject description"),
        flashcards: [
          {
            front,
            back,
            dueAt: new Date(Date.now() - 60_000),
          },
          {
            front: uniqueValue("E2E Not Due Front"),
            back: uniqueValue("E2E Not Due Back"),
            dueAt: new Date(Date.now() + 86_400_000),
          },
        ],
      },
    );

    await page.goto(`/en/flashcards/review?subjectId=${subjectId}`);

    await expect(page.getByText("1 due of 2 total cards.")).toBeVisible();
    await expect(page.getByText(front, { exact: true })).toBeVisible();
    await expect(page.getByText(back, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Show Answer" }).click();
    await expect(page.getByText(back, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Good" }).click();

    await expect(page.getByText("No cards due right now.")).toBeVisible();
    await expect(page.getByText("All caught up")).toBeVisible();
  });

  test("filters the review queue by subject", async ({ page }) => {
    const scopedFront = uniqueValue("E2E Scoped Review Front");
    const otherFront = uniqueValue("E2E Other Review Front");

    const { subjectId } = await seedFlashcardReviewSubject(
      e2eSubjectsUser.email,
      {
        name: uniqueValue("E2E Scoped Review Subject"),
        description: uniqueValue("Scoped review subject description"),
        flashcards: [
          {
            front: scopedFront,
            back: uniqueValue("E2E Scoped Review Back"),
            dueAt: new Date(Date.now() - 60_000),
          },
          {
            front: uniqueValue("E2E Scoped Future Front"),
            back: uniqueValue("E2E Scoped Future Back"),
            dueAt: new Date(Date.now() + 86_400_000),
          },
        ],
      },
    );

    await seedFlashcardReviewSubject(e2eSubjectsUser.email, {
      name: uniqueValue("E2E Other Review Subject"),
      description: uniqueValue("Other review subject description"),
      flashcards: [
        {
          front: otherFront,
          back: uniqueValue("E2E Other Review Back"),
          dueAt: new Date(Date.now() - 60_000),
        },
      ],
    });

    await page.goto(`/en/flashcards/review?subjectId=${subjectId}`);

    await expect(page.getByText("1 due of 2 total cards.")).toBeVisible();
    await expect(page.getByText(scopedFront, { exact: true })).toBeVisible();
    await expect(page.getByText(otherFront, { exact: true })).toHaveCount(0);
  });
});
