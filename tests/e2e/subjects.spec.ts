import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjects,
  clearUserSubjectsByNames,
  createSubject,
} from "./support/db";
import { openSubjectDetailByName } from "./support/subjects";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("subject", testTitle);
}

function getSubjectRow(page: Page, name: string) {
  return page.getByRole("row").filter({ hasText: name });
}

async function selectSubjectRow(page: Page, name: string) {
  const row = getSubjectRow(page, name);
  await expect(row).toBeVisible();
  await row.locator('td[data-no-row-click="true"]').first().click();
  await expect(
    row.getByRole("checkbox", { name: "Select subject" }),
  ).toHaveAttribute("aria-checked", "true");
}

async function openSubjectActions(page: Page, name: string) {
  const row = getSubjectRow(page, name);
  await expect(row).toBeVisible();
  await row.hover();
  const actionsButton = row.getByRole("button", {
    name: "Open subject actions",
  });

  await expect(actionsButton).toBeVisible();
  await actionsButton.click();
}

async function openActiveSubjectActions(page: Page, name: string) {
  await openSubjectActions(page, name);
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
}

test("can create a subject", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialSubjectName = getUniqueSubjectName("create");
    const cleanupNames = [initialSubjectName];

    await clearUserSubjectsByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, cleanupNames));

    await page.goto("/subjects");
    await expect(
      page.getByRole("heading", { name: "Subjects", exact: true }),
    ).toBeVisible();

    await page.locator("#btn-create-subject").click();
    const createDialog = page.getByRole("dialog", { name: "Create Subject" });
    await createDialog
      .locator("#form-create-subject-name")
      .fill(initialSubjectName);
    await createDialog.getByRole("button", { name: "Create Subject" }).click();

    const subjectRow = getSubjectRow(page, initialSubjectName);

    await expect(subjectRow).toBeVisible();

    await openSubjectDetailByName(page, initialSubjectName);
  });
});

test("can edit a subject", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialSubjectName = getUniqueSubjectName("edit-initial");
    const updatedSubjectName = getUniqueSubjectName("edit-updated");
    const cleanupNames = [initialSubjectName, updatedSubjectName];

    await clearUserSubjectsByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, cleanupNames));

    await createSubject(user.userId, initialSubjectName);

    await page.goto("/subjects");
    await expect(
      page.getByRole("heading", { name: "Subjects", exact: true }),
    ).toBeVisible();

    await openActiveSubjectActions(page, initialSubjectName);
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit Subject" });
    await editDialog
      .locator("#form-edit-subject-name")
      .fill(updatedSubjectName);
    await editDialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(editDialog).not.toBeVisible();

    const editedRow = getSubjectRow(page, updatedSubjectName);

    await expect(editedRow).toBeVisible();

    await openSubjectDetailByName(page, updatedSubjectName);
  });
});

test("can delete a subject", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialSubjectName = getUniqueSubjectName("delete");
    const cleanupNames = [initialSubjectName];

    await clearUserSubjectsByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, cleanupNames));

    await createSubject(user.userId, initialSubjectName);

    await page.goto("/subjects");
    await expect(
      page.getByRole("heading", { name: "Subjects", exact: true }),
    ).toBeVisible();

    await openSubjectDetailByName(page, initialSubjectName);

    await page.getByTestId("subject-detail-delete").click();
    await page.getByTestId("confirm-delete-subject").click();

    await page.waitForURL("**/subjects");
    await expect(getSubjectRow(page, initialSubjectName)).toHaveCount(0);
  });
});

test("can bulk delete selected subjects", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const names = [
      getUniqueSubjectName("bulk-delete-1"),
      getUniqueSubjectName("bulk-delete-2"),
    ];

    await clearUserSubjects(user.userId);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, names));

    for (const name of names) {
      await createSubject(user.userId, name);
    }

    await page.goto("/subjects");
    await selectSubjectRow(page, names[0]);
    await selectSubjectRow(page, names[1]);
    await page.getByRole("button", { name: "Delete" }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete Subjects" });
    await deleteDialog.getByRole("button", { name: "Delete" }).click();
    await expect(deleteDialog).not.toBeVisible();

    for (const name of names) {
      await expect(getSubjectRow(page, name)).toHaveCount(0);
    }
  });
});
