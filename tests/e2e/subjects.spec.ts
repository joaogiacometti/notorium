import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import { clearUserSubjectsByNames, createSubject } from "./support/db";
import { openSubjectDetailByName } from "./support/subjects";

const initialSubjectDescription =
  "Initial subject description for e2e coverage.";
const updatedSubjectDescription =
  "Updated subject description for e2e coverage.";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("subject", testTitle);
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

    await openSubjectDetailByName(page, initialSubjectName);
    await expect(page.getByText(initialSubjectDescription)).toBeVisible();
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
    await editDialog
      .locator("#form-edit-subject-name")
      .fill(updatedSubjectName);
    await editDialog
      .locator("#form-edit-subject-description")
      .fill(updatedSubjectDescription);
    await editDialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(editDialog).not.toBeVisible();

    const editedCard = page
      .getByTestId("subject-card")
      .filter({ hasText: updatedSubjectName })
      .first();

    await expect(editedCard).toBeVisible();
    await expect(editedCard).toContainText(updatedSubjectDescription);

    await openSubjectDetailByName(page, updatedSubjectName);
    await expect(page.getByText(updatedSubjectDescription)).toBeVisible();
  });
});

test("can delete a subject", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialSubjectName = getUniqueSubjectName("delete");
    const cleanupNames = [initialSubjectName];

    await clearUserSubjectsByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, cleanupNames));

    await createSubject(
      user.userId,
      initialSubjectName,
      initialSubjectDescription,
    );

    await page.goto("/subjects");
    await expect(
      page.getByRole("heading", { name: "Subjects", exact: true }),
    ).toBeVisible();

    await openSubjectDetailByName(page, initialSubjectName);

    await page.getByTestId("subject-detail-delete").click();
    await page.getByTestId("confirm-delete-subject").click();

    await page.waitForURL("**/subjects");
    await expect(
      page.getByTestId("subject-card").filter({ hasText: initialSubjectName }),
    ).toHaveCount(0);
  });
});

test("can archive and restore a subject", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const subjectName = getUniqueSubjectName("archive-restore");
    const cleanupNames = [subjectName];

    await clearUserSubjectsByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, cleanupNames));

    await createSubject(user.userId, subjectName, initialSubjectDescription);

    await openSubjectDetailByName(page, subjectName);

    await page.getByTestId("subject-detail-archive").click();
    await page.getByTestId("confirm-archive-subject").click();

    await page.waitForURL("**/subjects");
    await expect(
      page.getByTestId("subject-card").filter({ hasText: subjectName }),
    ).toHaveCount(0);

    await page.goto("/subjects/archived");
    const archivedCard = page.getByText(subjectName, { exact: true });
    await expect(archivedCard).toBeVisible();

    await page.getByRole("button", { name: "Restore" }).click();

    await expect(archivedCard).toHaveCount(0);

    await page.goto("/subjects");
    await expect(
      page.getByTestId("subject-card").filter({ hasText: subjectName }),
    ).toHaveCount(1);
  });
});

test("can delete an archived subject from the archived page", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const subjectName = getUniqueSubjectName("archived-delete");
    const cleanupNames = [subjectName];

    await clearUserSubjectsByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, cleanupNames));

    await createSubject(user.userId, subjectName, initialSubjectDescription);

    await openSubjectDetailByName(page, subjectName);
    await page.getByTestId("subject-detail-archive").click();
    await page.getByTestId("confirm-archive-subject").click();
    await page.waitForURL("**/subjects");

    await page.goto("/subjects/archived");
    const archivedCard = page.getByText(subjectName, { exact: true });

    await expect(archivedCard).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByTestId("confirm-delete-subject").click();

    await expect(archivedCard).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "No archived subjects" }),
    ).toBeVisible();
  });
});
