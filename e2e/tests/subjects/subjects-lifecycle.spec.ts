import { expect, test } from "@playwright/test";
import { e2eSubjectNames, e2eSubjectsUser } from "../../helpers/constants";
import { clearE2ESubjects, closeE2EDb } from "../../helpers/db";
import {
  archiveFirstSubject,
  createSubject,
  deleteFirstSubject,
  editFirstSubject,
} from "../../helpers/subjects";

test.describe("subjects", () => {
  test.afterAll(async () => {
    await closeE2EDb();
  });

  test.beforeEach(async () => {
    await clearE2ESubjects(e2eSubjectsUser.email);
  });

  test("deletes an active subject directly from the subjects list", async ({
    page,
  }) => {
    await page.goto("/en/subjects");

    await createSubject(page, {
      name: e2eSubjectNames.created,
      description: "Created from E2E",
    });

    await expect(page.getByText(e2eSubjectNames.created)).toBeVisible();

    await deleteFirstSubject(page);

    await expect(page.getByText(e2eSubjectNames.created)).toHaveCount(0);
  });

  test("creates a subject", async ({ page }) => {
    await page.goto("/en/subjects");

    await createSubject(page, {
      name: e2eSubjectNames.created,
      description: "Created from E2E",
    });

    await expect(page.getByText(e2eSubjectNames.created)).toBeVisible();
    await expect(page.getByText("Created from E2E")).toBeVisible();
  });

  test("edits an existing subject", async ({ page }) => {
    await page.goto("/en/subjects");

    await createSubject(page, {
      name: e2eSubjectNames.created,
      description: "Created from E2E",
    });

    await editFirstSubject(page, {
      name: e2eSubjectNames.updated,
      description: "Edited from E2E",
    });

    await page.reload();
    await expect(page.getByText(e2eSubjectNames.updated)).toBeVisible();
    await expect(page.getByText("Edited from E2E")).toBeVisible();
  });

  test("archives and restores a subject", async ({ page }) => {
    await page.goto("/en/subjects");

    await createSubject(page, {
      name: e2eSubjectNames.updated,
      description: "Edited from E2E",
    });

    await archiveFirstSubject(page);

    await expect(page.getByRole("link", { name: /Archived/ })).toBeVisible();
    await expect(page.getByLabel("Open subject actions")).toHaveCount(0);

    await page.getByRole("link", { name: /Archived/ }).click();
    await expect(page).toHaveURL(/\/en\/subjects\/archived$/);
    await expect(page.getByText(e2eSubjectNames.updated)).toBeVisible();

    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText(e2eSubjectNames.updated)).toHaveCount(0);
    await page.getByRole("link", { name: "Back to Subjects" }).click();

    await expect(page).toHaveURL(/\/en\/subjects$/);
    await expect(page.getByText(e2eSubjectNames.updated)).toBeVisible();
    await expect(page.getByText("Edited from E2E")).toBeVisible();
  });

  test("deletes an archived subject", async ({ page }) => {
    await page.goto("/en/subjects");

    await createSubject(page, {
      name: e2eSubjectNames.updated,
      description: "Edited from E2E",
    });

    await archiveFirstSubject(page);
    await page.getByRole("link", { name: /Archived/ }).click();
    await expect(page.getByText(e2eSubjectNames.updated)).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).first().click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByText(e2eSubjectNames.updated)).toHaveCount(0);
    await expect(page.getByText("No archived subjects")).toBeVisible();
  });
});
