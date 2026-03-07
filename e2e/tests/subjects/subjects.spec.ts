import { expect, test } from "@playwright/test";
import { closeE2EDb } from "../../helpers/db";
import { createSubject } from "../../helpers/subjects";

function uniqueValue(base: string) {
  return `${base} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function subjectCard(
  page: Parameters<typeof createSubject>[0],
  subjectName: string,
) {
  return page
    .locator("div.rounded-xl", {
      has: page.getByRole("link", { name: subjectName, exact: true }),
    })
    .first();
}

function archivedSubjectCard(
  page: Parameters<typeof createSubject>[0],
  subjectName: string,
) {
  return page
    .locator("div.rounded-xl", {
      has: page.getByText(subjectName, { exact: true }),
    })
    .first();
}

test.describe("subjects", () => {
  test.afterAll(async () => {
    await closeE2EDb();
  });

  test("creates a subject", async ({ page }) => {
    const createdName = uniqueValue("E2E Subject Created");
    const createdDescription = uniqueValue("Created from E2E");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: createdName,
      description: createdDescription,
    });

    const createdCard = subjectCard(page, createdName);
    await expect(
      createdCard.getByRole("link", { name: createdName }),
    ).toBeVisible();
    await expect(createdCard.getByText(createdDescription)).toBeVisible();
  });

  test("edits an existing subject", async ({ page }) => {
    const createdName = uniqueValue("E2E Subject Created");
    const createdDescription = uniqueValue("Created from E2E");
    const updatedName = uniqueValue("E2E Subject Updated");
    const updatedDescription = uniqueValue("Edited from E2E");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: createdName,
      description: createdDescription,
    });

    const createdCard = subjectCard(page, createdName);
    await createdCard.getByLabel("Open subject actions").click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await page.locator("#form-edit-subject-name").fill(updatedName);
    await page
      .locator("#form-edit-subject-description")
      .fill(updatedDescription);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    const updatedCard = subjectCard(page, updatedName);
    await expect(
      updatedCard.getByRole("link", { name: updatedName }),
    ).toBeVisible();
    await expect(updatedCard.getByText(updatedDescription)).toBeVisible();
    await page.reload();
    await expect(
      updatedCard.getByRole("link", { name: updatedName }),
    ).toBeVisible();
    await expect(updatedCard.getByText(updatedDescription)).toBeVisible();
  });

  test("archives and restores a subject", async ({ page }) => {
    const createdName = uniqueValue("E2E Subject Updated");
    const createdDescription = uniqueValue("Edited from E2E");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: createdName,
      description: createdDescription,
    });

    const createdCard = subjectCard(page, createdName);
    await createdCard.getByLabel("Open subject actions").click();
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await page.getByRole("button", { name: "Archive" }).click();

    await expect(page.getByRole("link", { name: /Archived/ })).toBeVisible();
    await expect(
      page.getByRole("link", { name: createdName, exact: true }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: /Archived/ }).click();
    await expect(page).toHaveURL(/\/en\/subjects\/archived$/);
    await expect(page.getByText(createdName, { exact: true })).toBeVisible();

    const archivedCard = archivedSubjectCard(page, createdName);
    await archivedCard.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText(createdName, { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Back to Subjects" }).click();

    await expect(page).toHaveURL(/\/en\/subjects$/);
    const restoredCard = subjectCard(page, createdName);
    await expect(
      restoredCard.getByRole("link", { name: createdName }),
    ).toBeVisible();
    await expect(restoredCard.getByText(createdDescription)).toBeVisible();
  });

  test("deletes an active subject directly from the subjects list", async ({
    page,
  }) => {
    const createdName = uniqueValue("E2E Subject Created");
    const createdDescription = uniqueValue("Created from E2E");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: createdName,
      description: createdDescription,
    });

    const createdCard = subjectCard(page, createdName);
    await expect(
      createdCard.getByRole("link", { name: createdName }),
    ).toBeVisible();

    await createdCard.getByLabel("Open subject actions").click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(
      page.getByRole("link", { name: createdName, exact: true }),
    ).toHaveCount(0);
  });

  test("deletes an archived subject", async ({ page }) => {
    const createdName = uniqueValue("E2E Subject Updated");
    const createdDescription = uniqueValue("Edited from E2E");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: createdName,
      description: createdDescription,
    });

    const createdCard = subjectCard(page, createdName);
    await createdCard.getByLabel("Open subject actions").click();
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await page.getByRole("button", { name: "Archive" }).click();

    await page.getByRole("link", { name: /Archived/ }).click();
    await expect(page.getByText(createdName, { exact: true })).toBeVisible();

    const archivedCard = archivedSubjectCard(page, createdName);
    await archivedCard.getByRole("button", { name: "Delete" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByText(createdName, { exact: true })).toHaveCount(0);
    await expect(page.getByText("No archived subjects")).toBeVisible();
  });
});
