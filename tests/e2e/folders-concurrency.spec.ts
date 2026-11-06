import type { Page } from "@playwright/test";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { folder } from "@/db/schema";
import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import { clearUserFoldersByNames, createFolder } from "./support/db";
import { FolderMoveLock } from "./support/folder-move-lock";
import { expandFolderSidebarRow, getFolderSidebarRow } from "./support/folders";

async function dragFolder(
  page: Page,
  source: string,
  target: string,
): Promise<void> {
  const from = getFolderSidebarRow(page, source).locator('[draggable="true"]');
  const to = getFolderSidebarRow(page, target).locator('[draggable="true"]');
  await from.dragTo(to);
}

async function readFolderParents(userId: string, ids: string[]) {
  return getDb()
    .select({ id: folder.id, parent: folder.parentFolderId })
    .from(folder)
    .where(and(eq(folder.userId, userId), inArray(folder.id, ids)));
}

test("reciprocal moves from two tabs cannot create a folder cycle", async ({
  page,
  context,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const names = [
      getPrefixedValue("folder", "race-a"),
      getPrefixedValue("folder", "race-b"),
    ];
    registerCleanup(() => clearUserFoldersByNames(e2eUser.userId, names));
    const first = await createFolder(e2eUser.userId, names[0]);
    const second = await createFolder(e2eUser.userId, names[1]);
    const otherTab = await context.newPage();
    registerCleanup(() => otherTab.close());
    await Promise.all([page.goto("/"), otherTab.goto("/")]);
    for (const tab of [page, otherTab]) {
      await expect(getFolderSidebarRow(tab, names[0])).toBeVisible();
      await expect(getFolderSidebarRow(tab, names[1])).toBeVisible();
    }
    const lock = await FolderMoveLock.acquire(e2eUser.userId);
    registerCleanup(() => lock.release());
    await Promise.all([
      dragFolder(page, names[0], names[1]),
      dragFolder(otherTab, names[1], names[0]),
    ]);
    await lock.waitForMoves(2);
    await lock.release();
    const ids = [first.id, second.id];
    await expect
      .poll(async () => {
        const parents = await readFolderParents(e2eUser.userId, ids);
        return parents.filter((row) => row.parent !== null).length;
      })
      .toBe(1);
    const rejection = "This move would create a circular folder hierarchy.";
    await expect
      .poll(
        async () =>
          (await page.getByText(rejection, { exact: true }).count()) +
          (await otherTab.getByText(rejection, { exact: true }).count()),
      )
      .toBe(1);
    const parents = await readFolderParents(e2eUser.userId, ids);
    const rootName =
      parents.find((row) => row.id === first.id)?.parent === null
        ? names[0]
        : names[1];
    await page.reload();
    await expandFolderSidebarRow(page, rootName);
    for (const name of names)
      await expect(getFolderSidebarRow(page, name)).toBeVisible();
  });
});
