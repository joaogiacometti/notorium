import type { Page } from "@playwright/test";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import {
  clearUserDecksByNames,
  createFsrsOptimizationReviewHistory,
  readFsrsSchedulerSettings,
  resetFsrsSchedulerSettings,
  seedFsrsSchedulerSettings,
} from "./support/db";

const optimizationReviewCount = 64;
const optimizationTimeoutMs = 35_000;

function getUniqueDeckName(testTitle: string) {
  return getPrefixedValue("account-fsrs-deck", testTitle);
}

async function openAccountPage(page: Page) {
  // Account settings live in a dialog; the `?settings=` deep link opens it
  // directly to the Flashcards section from any app page.
  await page.goto("/planning?settings=flashcards");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Flashcard Optimization", { exact: true }),
  ).toBeVisible();
}

test("can manually optimize flashcard scheduling", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const deckName = getUniqueDeckName("manual-optimize");
    await seedFsrsSchedulerSettings(e2eUser.userId);
    await createFsrsOptimizationReviewHistory(
      e2eUser.userId,
      deckName,
      optimizationReviewCount,
    );
    registerCleanup(() => clearUserDecksByNames(e2eUser.userId, [deckName]));
    registerCleanup(() => resetFsrsSchedulerSettings(e2eUser.userId));

    await openAccountPage(page);
    await page.getByRole("button", { name: "Optimize now" }).click();

    await expect
      .poll(
        async () => {
          const settings = await readFsrsSchedulerSettings(e2eUser.userId);
          return (
            settings.optimizedReviewCount === optimizationReviewCount &&
            settings.lastOptimizedAt instanceof Date
          );
        },
        {
          timeout: optimizationTimeoutMs,
        },
      )
      .toBe(true);
    const settings = await readFsrsSchedulerSettings(e2eUser.userId);
    expect(settings.optimizedReviewCount).toBe(optimizationReviewCount);
    expect(settings.lastOptimizedAt).toBeInstanceOf(Date);
  });
});

test("can reset flashcard optimization without deleting review history", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const deckName = getUniqueDeckName("reset-optimization");
    await seedFsrsSchedulerSettings(e2eUser.userId, { optimized: true });
    await createFsrsOptimizationReviewHistory(
      e2eUser.userId,
      deckName,
      optimizationReviewCount,
    );
    registerCleanup(() => clearUserDecksByNames(e2eUser.userId, [deckName]));
    registerCleanup(() => resetFsrsSchedulerSettings(e2eUser.userId));

    await openAccountPage(page);
    await expect(page.getByText("Last optimized:")).toBeVisible();

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Reset Optimization" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Reset", exact: true }).click();

    await expect
      .poll(async () => {
        const settings = await readFsrsSchedulerSettings(e2eUser.userId);
        return (
          settings.optimizedReviewCount === 0 &&
          settings.lastOptimizedAt === null &&
          settings.reviewCount === optimizationReviewCount
        );
      })
      .toBe(true);
    const settings = await readFsrsSchedulerSettings(e2eUser.userId);
    expect(settings.weights).toEqual(getDefaultFsrsWeights());
    expect(settings.optimizedReviewCount).toBe(0);
    expect(settings.lastOptimizedAt).toBeNull();
    expect(settings.reviewCount).toBe(optimizationReviewCount);
  });
});
