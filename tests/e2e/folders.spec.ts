import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import {
  clearUserFolders,
  clearUserFoldersByNames,
  createFolder,
  createNote,
} from "./support/db";
import {
  expandFolderSidebarRow,
  getFolderSidebarRow,
  openFolderSidebarActions,
} from "./support/folders";

function getUniqueFolderName(testTitle: string) {
  return getPrefixedValue("folder", testTitle);
}

/**
 * Folder edit/delete only update the sidebar tree after a `router.refresh()`
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

test("can create a folder", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialFolderName = getUniqueFolderName("create");
    const cleanupNames = [initialFolderName];

    await clearUserFoldersByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserFoldersByNames(user.userId, cleanupNames));

    await waitForAppShell(page);

    await page.getByRole("button", { name: "New folder", exact: true }).click();
    const createDialog = page.getByRole("dialog", { name: "Create Folder" });
    await createDialog
      .locator("#form-create-folder-name")
      .fill(initialFolderName);
    await createDialog.getByRole("button", { name: "Create Folder" }).click();

    // Verify the folder appears in the sidebar tree.
    await expect(getFolderSidebarRow(page, initialFolderName)).toBeVisible();
  });
});

test("nested folders expose their documents through folder routes", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const rootName = getUniqueFolderName("nested-documents");
    const path = `${rootName}::References`;
    registerCleanup(() => clearUserFoldersByNames(e2eUser.userId, [rootName]));

    await waitForAppShell(page);
    await page.getByRole("button", { name: "New folder", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Create Folder" });
    await dialog.getByLabel("Name", { exact: true }).fill(path);
    await dialog.getByRole("button", { name: "Create Folder" }).click();
    await expect(dialog).not.toBeVisible();

    const optionsResponse = await page.request.get("/api/folders/options");
    expect(optionsResponse.ok()).toBe(true);
    const options = (await optionsResponse.json()) as Array<{
      id: string;
      name: string;
      path: string;
      parentFolderId: string | null;
    }>;
    const root = options.find((item) => item.path === rootName);
    const child = options.find((item) => item.path === path);
    expect(root).toBeDefined();
    expect(child).toMatchObject({
      name: "References",
      parentFolderId: root?.id,
    });
    if (!child) throw new Error("Expected the nested folder to exist");

    const title = `${rootName} note`;
    const note = await createNote(
      e2eUser.userId,
      child.id,
      title,
      "<p>Saved content</p>",
    );
    const documents = await page.request.get(
      `/api/folders/${child.id}/documents`,
    );
    expect(documents.ok()).toBe(true);
    expect(await documents.json()).toEqual([
      expect.objectContaining({
        id: note.id,
        kind: "note",
        folderId: child.id,
        title,
      }),
    ]);

    await page.goto(`/folders/${child.id}/documents/notes/${note.id}`);
    await expect(page).toHaveURL(
      `/folders/${child.id}/documents/notes/${note.id}`,
    );
    await expect(page.locator("#form-edit-note-title")).toHaveValue(title);
    await expect(
      page.getByRole("main").getByText("Saved content", { exact: true }),
    ).toBeVisible();
    await expect(getFolderSidebarRow(page, rootName)).toBeVisible();
    await expect(getFolderSidebarRow(page, "References")).toBeVisible();
  });
});

test("can edit a folder", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialFolderName = getUniqueFolderName("edit-initial");
    const updatedFolderName = getUniqueFolderName("edit-updated");
    const cleanupNames = [initialFolderName, updatedFolderName];

    await clearUserFoldersByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserFoldersByNames(user.userId, cleanupNames));

    await createFolder(user.userId, initialFolderName);

    await waitForAppShell(page);

    await openFolderSidebarActions(page, initialFolderName);
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const editDialog = page.getByRole("dialog", { name: "Rename Folder" });
    await editDialog.locator("#form-edit-folder-name").fill(updatedFolderName);
    await editDialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(editDialog).not.toBeVisible();

    // Reload for a deterministic tree, then verify the rename is reflected.
    await reloadAppShell(page);
    await expect(getFolderSidebarRow(page, updatedFolderName)).toBeVisible();
  });
});

test("can delete a folder", async ({ page, e2eUser }) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const initialFolderName = getUniqueFolderName("delete");
    const cleanupNames = [initialFolderName];

    await clearUserFoldersByNames(user.userId, cleanupNames);
    registerCleanup(() => clearUserFoldersByNames(user.userId, cleanupNames));

    await createFolder(user.userId, initialFolderName);

    await waitForAppShell(page);

    await openFolderSidebarActions(page, initialFolderName);
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const deleteDialog = page.getByRole("dialog", {
      name: "Delete Folder",
    });
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(deleteDialog).not.toBeVisible();

    // Reload for a deterministic tree; the folder should be gone.
    await reloadAppShell(page);
    await expect(getFolderSidebarRow(page, initialFolderName)).toHaveCount(0);
  });
});

test("can delete multiple folders from the sidebar", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const names = [
      getUniqueFolderName("bulk-delete-1"),
      getUniqueFolderName("bulk-delete-2"),
    ];

    await clearUserFolders(user.userId);
    registerCleanup(() => clearUserFoldersByNames(user.userId, names));

    for (const name of names) {
      await createFolder(user.userId, name);
    }

    await waitForAppShell(page);

    // Delete folders one-by-one through the sidebar context menu,
    // since the new UI doesn't have a bulk selection table.
    for (const name of names) {
      await openFolderSidebarActions(page, name);
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const deleteDialog = page.getByRole("dialog", {
        name: "Delete Folder",
      });
      await deleteDialog
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(deleteDialog).not.toBeVisible();
    }

    // Reload for a deterministic tree; both folders should be gone.
    await reloadAppShell(page);
    for (const name of names) {
      await expect(getFolderSidebarRow(page, name)).toHaveCount(0);
    }
  });
});

test("offers a retry when a folder's documents fail to load", async ({
  page,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const user = e2eUser;
    const folderName = getUniqueFolderName("documents-retry");
    const noteTitle = `${folderName} note`;
    registerCleanup(() => clearUserFoldersByNames(user.userId, [folderName]));
    const folder = await createFolder(user.userId, folderName);
    await createNote(user.userId, folder.id, noteTitle, "<p>Body</p>");

    await waitForAppShell(page);
    // Fail only the first documents read; the retry goes through.
    let failedOnce = false;
    await page.route("**/api/folders/*/documents", (route) => {
      if (failedOnce) {
        return route.continue();
      }
      failedOnce = true;
      return route.abort();
    });

    await expandFolderSidebarRow(page, folderName);
    const tree = page.locator('nav[aria-label="Folders"]');
    await expect(tree.getByText("Couldn't load documents.")).toBeVisible();
    await expect(tree.getByText("Loading…")).toHaveCount(0);

    await tree.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(tree.getByRole("link", { name: noteTitle })).toBeVisible();
  });
});
