import { expect, test } from "@playwright/test";
import {
  clearUserSubjectsByNames,
  createSubject,
  ensureApprovedE2EUser,
} from "./support/db";

const initialSubjectDescription =
  "Initial subject description for e2e coverage.";
const updatedSubjectDescription =
  "Updated subject description for e2e coverage.";

function getUniqueSubjectName(testTitle: string) {
  return `E2E Subject ${testTitle} ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

test("can create a subject", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const initialSubjectName = getUniqueSubjectName("create");
  await clearUserSubjectsByNames(user.userId, [initialSubjectName]);

  await page.goto("/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  await page.locator("#btn-create-subject").click();
  const createDialog = page.getByRole("dialog", { name: "Create Subject" });
  await createDialog
    .locator("#form-create-subject-name")
    .fill(initialSubjectName);
  await createDialog
    .locator("#form-create-subject-description")
    .fill(initialSubjectDescription);
  await createDialog.getByRole("button", { name: "Create Subject" }).click();

  const subjectCard = page
    .getByTestId("subject-card")
    .filter({ hasText: initialSubjectName })
    .first();

  await expect(subjectCard).toBeVisible();
  await expect(subjectCard).toContainText(initialSubjectDescription);

  await subjectCard.getByTestId("subject-card-link").click();
  await expect(
    page.getByRole("heading", { name: initialSubjectName }),
  ).toBeVisible();
  await expect(page.getByText(initialSubjectDescription)).toBeVisible();

  await clearUserSubjectsByNames(user.userId, [initialSubjectName]);
});

test("can edit a subject", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const initialSubjectName = getUniqueSubjectName("edit-initial");
  const updatedSubjectName = getUniqueSubjectName("edit-updated");
  await clearUserSubjectsByNames(user.userId, [
    initialSubjectName,
    updatedSubjectName,
  ]);
  await createSubject(
    user.userId,
    initialSubjectName,
    initialSubjectDescription,
  );

  await page.goto("/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  const subjectCard = page
    .getByTestId("subject-card")
    .filter({ hasText: initialSubjectName })
    .first();

  await subjectCard.getByTestId("subject-card-actions").click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Subject" });
  await editDialog.locator("#form-edit-subject-name").fill(updatedSubjectName);
  await editDialog
    .locator("#form-edit-subject-description")
    .fill(updatedSubjectDescription);
  await editDialog.getByRole("button", { name: "Save Changes" }).click();

  const editedCard = page
    .getByTestId("subject-card")
    .filter({ hasText: updatedSubjectName })
    .first();

  await expect(editedCard).toBeVisible();
  await expect(editedCard).toContainText(updatedSubjectDescription);

  await editedCard.getByTestId("subject-card-link").click();
  await expect(
    page.getByRole("heading", { name: updatedSubjectName }),
  ).toBeVisible();
  await expect(page.getByText(updatedSubjectDescription)).toBeVisible();

  await clearUserSubjectsByNames(user.userId, [updatedSubjectName]);
});

test("can delete a subject", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const initialSubjectName = getUniqueSubjectName("delete");
  await clearUserSubjectsByNames(user.userId, [initialSubjectName]);
  await createSubject(
    user.userId,
    initialSubjectName,
    initialSubjectDescription,
  );

  await page.goto("/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  const subjectCard = page
    .getByTestId("subject-card")
    .filter({ hasText: initialSubjectName })
    .first();

  await subjectCard.getByTestId("subject-card-link").click();
  await expect(
    page.getByRole("heading", { name: initialSubjectName }),
  ).toBeVisible();

  await page.getByTestId("subject-detail-delete").click();
  await page.getByTestId("confirm-delete-subject").click();

  await page.waitForURL("**/subjects");
  await expect(
    page.getByTestId("subject-card").filter({ hasText: initialSubjectName }),
  ).toHaveCount(0);
});
