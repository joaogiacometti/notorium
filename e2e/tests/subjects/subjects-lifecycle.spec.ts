import { expect, test } from "@playwright/test";
import { e2eSubjectNames } from "../../helpers/constants";
import { clearE2ESubjects, closeE2EDb } from "../../helpers/db";
import {
  archiveFirstSubject,
  createSubject,
  editFirstSubject,
} from "../../helpers/subjects";

test.describe("subjects", () => {
  test.afterAll(async () => {
    await closeE2EDb();
  });

  test.beforeEach(async () => {
    await clearE2ESubjects();
  });

  test("create, edit, and archive subject without re-login", async ({
    page,
  }) => {
    await page.goto("/en/subjects");

    await createSubject(page, {
      name: e2eSubjectNames.created,
      description: "Created from E2E",
    });

    await expect(page.getByText(e2eSubjectNames.created)).toBeVisible();

    await editFirstSubject(page, {
      name: e2eSubjectNames.updated,
      description: "Edited from E2E",
    });

    await expect(page.getByText(e2eSubjectNames.updated)).toBeVisible();

    await archiveFirstSubject(page);

    await expect(page.getByRole("link", { name: "Archived 1" })).toBeVisible();
    await expect(page.getByLabel("Open subject actions")).toHaveCount(0);

    await page.getByRole("link", { name: /Archived/ }).click();
    await expect(page).toHaveURL(/\/en\/subjects\/archived$/);
    await expect(page.getByText(e2eSubjectNames.updated)).toBeVisible();
  });
});
