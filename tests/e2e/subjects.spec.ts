import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjects,
  clearUserSubjectsByNames,
  createSubject,
} from "./support/db";
import { breadcrumbCurrent } from "./support/page-chrome";
import {
  getSubjectSidebarLink,
  openSubjectSidebarActions,
} from "./support/subjects";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("subject", testTitle);
}

/**
 * Subject edit/delete only update the sidebar tree after a `router.refresh()`
 * server round-trip, which races test assertions under parallel load. Reloading
 * after the mutation gives a deterministic, fully server-rendered tree to assert
 * against. The mutation is already committed once its dialog closes on success.
 */
async function reloadAppShell(page: Page) {
  await page.reload();
  await expect(page.getByTestId("home-greeting")).toBeVisible();
}

/** Waits for the app shell to be ready by checking the home greeting. */
async function waitForAppShell(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("home-greeting")).toBeVisible();
}

test("can create a subject", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialSubjectName = getUniqueSubjectName("create");
    const cleanupNames = [initialSubjectName];

    await clearUserSubjectsByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserSubjectsByNames(user.userId, cleanupNames));

    await waitForAppShell(page);

    await page
      .getByRole("button", { name: "New subject", exact: true })
      .click();
    const createDialog = page.getByRole("dialog", { name: "Create Subject" });
    await createDialog
      .locator("#form-create-subject-name")
      .fill(initialSubjectName);
    await createDialog.getByRole("button", { name: "Create Subject" }).click();

    // Verify the subject appears in the sidebar tree.
    await expect(getSubjectSidebarLink(page, initialSubjectName)).toBeVisible();

    // Navigate to its detail page.
    await getSubjectSidebarLink(page, initialSubjectName).click();
    await expect(breadcrumbCurrent(page, initialSubjectName)).toBeVisible();
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

    await waitForAppShell(page);

    await openSubjectSidebarActions(page, initialSubjectName);
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit Subject" });
    await editDialog
      .locator("#form-edit-subject-name")
      .fill(updatedSubjectName);
    await editDialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(editDialog).not.toBeVisible();

    // Reload for a deterministic tree, then verify the rename is reflected.
    await reloadAppShell(page);
    await expect(getSubjectSidebarLink(page, updatedSubjectName)).toBeVisible();

    // Navigate to the renamed subject's detail page.
    await getSubjectSidebarLink(page, updatedSubjectName).click();
    await expect(breadcrumbCurrent(page, updatedSubjectName)).toBeVisible();
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

    await waitForAppShell(page);

    await openSubjectSidebarActions(page, initialSubjectName);
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const deleteDialog = page.getByRole("dialog", {
      name: "Delete Subject",
    });
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(deleteDialog).not.toBeVisible();

    // Reload for a deterministic tree; the subject should be gone.
    await reloadAppShell(page);
    await expect(getSubjectSidebarLink(page, initialSubjectName)).toHaveCount(
      0,
    );
  });
});

test("can delete multiple subjects from the sidebar", async ({
  page,
  e2eUser,
}) => {
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

    await waitForAppShell(page);

    // Delete subjects one-by-one through the sidebar context menu,
    // since the new UI doesn't have a bulk selection table.
    for (const name of names) {
      await openSubjectSidebarActions(page, name);
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const deleteDialog = page.getByRole("dialog", {
        name: "Delete Subject",
      });
      await deleteDialog
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(deleteDialog).not.toBeVisible();
    }

    // Reload for a deterministic tree; both subjects should be gone.
    await reloadAppShell(page);
    for (const name of names) {
      await expect(getSubjectSidebarLink(page, name)).toHaveCount(0);
    }
  });
});
