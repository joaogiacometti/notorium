import type { Page } from "@playwright/test";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import {
  clearUserFoldersByNames,
  createFsrsOptimizationReviewHistory,
  readFsrsSchedulerSettings,
  resetFsrsSchedulerSettings,
  seedFsrsSchedulerSettings,
  seedReviewActivity,
} from "./support/db";

const optimizationReviewCount = 64;
const optimizationTimeoutMs = 35_000;

function getUniqueFolderName(testTitle: string) {
  return getPrefixedValue("account-fsrs-folder", testTitle);
}

async function openAccountPage(page: Page) {
  // Account settings live in a dialog; the `?settings=` deep link opens it
  // directly to the Flashcards section from any app page.
  await page.goto("/flashcards?settings=flashcards");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Scheduler optimization", { exact: true }),
  ).toBeVisible();
}

test("can manually optimize flashcard scheduling", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const folderName = getUniqueFolderName("manual-optimize");
    await seedFsrsSchedulerSettings(e2eUser.userId);
    await createFsrsOptimizationReviewHistory(
      e2eUser.userId,
      folderName,
      optimizationReviewCount,
    );
    registerCleanup(() =>
      clearUserFoldersByNames(e2eUser.userId, [folderName]),
    );
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
    const folderName = getUniqueFolderName("reset-optimization");
    await seedFsrsSchedulerSettings(e2eUser.userId, { optimized: true });
    await createFsrsOptimizationReviewHistory(
      e2eUser.userId,
      folderName,
      optimizationReviewCount,
    );
    registerCleanup(() =>
      clearUserFoldersByNames(e2eUser.userId, [folderName]),
    );
    registerCleanup(() => resetFsrsSchedulerSettings(e2eUser.userId));

    await openAccountPage(page);
    await expect(
      page.getByText("Last optimized", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reset to defaults" }).click();
    const dialog = page.getByRole("dialog", { name: "Reset to defaults" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Reset to defaults" }).click();

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

// Regression: the `?settings=` param used to come back after any Server Action
// (the router kept the pre-strip URL), so a reload reopened the dialog.
test("settings deep link does not reopen after a server action and reload", async ({
  page,
  e2eUser,
}) => {
  await page.goto("/?settings=account");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(e2eUser.email);
  await expect(page).toHaveURL((url) => !url.searchParams.has("settings"));
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
  await expect(page).toHaveURL((url) => !url.searchParams.has("settings"));

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Expand sidebar" }).click();
});

test("account time zone persists and moves review activity to the local day", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const reviewedAt = new Date();
    reviewedAt.setUTCDate(reviewedAt.getUTCDate() - 7);
    reviewedAt.setUTCHours(1, 0, 0, 0);
    registerCleanup(await seedReviewActivity(e2eUser.userId, reviewedAt));

    function reviewLabel(timeZone: string) {
      const label = new Intl.DateTimeFormat("en-US", {
        timeZone,
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(reviewedAt);
      return `1 review on ${label}`;
    }

    await page.goto("/?settings=account");
    await expect(page.getByTitle(reviewLabel("UTC"))).toHaveCount(1);
    await page
      .getByRole("textbox", { name: "Search settings" })
      .fill("timezone");
    await page.getByRole("button", { name: "Time zone: UTC" }).click();
    await page.getByPlaceholder("Search time zones…").fill("Sao Paulo");
    await page.getByRole("option", { name: "America/Sao Paulo" }).click();
    const saved = page.getByRole("button", {
      name: "Time zone: America/Sao_Paulo",
    });
    await expect(saved).toBeEnabled();
    await expect(page.getByTitle(reviewLabel("America/Sao_Paulo"))).toHaveCount(
      1,
    );

    await page.goto("/?settings=account");
    await saved.click();
    await page.getByRole("option", { name: /^UTC\b/ }).click();
    await expect(
      page.getByRole("button", { name: "Time zone: UTC" }),
    ).toBeEnabled();
    await expect(page.getByTitle(reviewLabel("UTC"))).toHaveCount(1);
  });
});
