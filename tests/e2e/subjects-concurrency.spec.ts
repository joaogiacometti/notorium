import type { Page } from "@playwright/test";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { subject } from "@/db/schema";
import { expect, test } from "./support/authenticated-test";
import { runWithCleanup } from "./support/cleanup";
import { getPrefixedValue } from "./support/data";
import { clearUserSubjectsByNames, createSubject } from "./support/db";
import { SubjectMoveLock } from "./support/subject-move-lock";
import {
  expandSubjectSidebarRow,
  getSubjectSidebarRow,
} from "./support/subjects";

async function dragSubject(
  page: Page,
  source: string,
  target: string,
): Promise<void> {
  const from = getSubjectSidebarRow(page, source).locator('[draggable="true"]');
  const to = getSubjectSidebarRow(page, target).locator('[draggable="true"]');
  await from.dragTo(to);
}

async function readSubjectParents(userId: string, ids: string[]) {
  return getDb()
    .select({ id: subject.id, parent: subject.parentSubjectId })
    .from(subject)
    .where(and(eq(subject.userId, userId), inArray(subject.id, ids)));
}

test("reciprocal moves from two tabs cannot create a subject cycle", async ({
  page,
  context,
  e2eUser,
}) => {
  await runWithCleanup(async (registerCleanup) => {
    const names = [
      getPrefixedValue("subject", "race-a"),
      getPrefixedValue("subject", "race-b"),
    ];
    registerCleanup(() => clearUserSubjectsByNames(e2eUser.userId, names));
    const first = await createSubject(e2eUser.userId, names[0]);
    const second = await createSubject(e2eUser.userId, names[1]);
    const otherTab = await context.newPage();
    registerCleanup(() => otherTab.close());
    await Promise.all([page.goto("/"), otherTab.goto("/")]);
    for (const tab of [page, otherTab]) {
      await expect(getSubjectSidebarRow(tab, names[0])).toBeVisible();
      await expect(getSubjectSidebarRow(tab, names[1])).toBeVisible();
    }
    const lock = await SubjectMoveLock.acquire(e2eUser.userId);
    registerCleanup(() => lock.release());
    await Promise.all([
      dragSubject(page, names[0], names[1]),
      dragSubject(otherTab, names[1], names[0]),
    ]);
    await lock.waitForMoves(2);
    await lock.release();
    const ids = [first.id, second.id];
    await expect
      .poll(async () => {
        const parents = await readSubjectParents(e2eUser.userId, ids);
        return parents.filter((row) => row.parent !== null).length;
      })
      .toBe(1);
    const rejection = "This move would create a circular subject hierarchy.";
    await expect
      .poll(
        async () =>
          (await page.getByText(rejection, { exact: true }).count()) +
          (await otherTab.getByText(rejection, { exact: true }).count()),
      )
      .toBe(1);
    const parents = await readSubjectParents(e2eUser.userId, ids);
    const rootName =
      parents.find((row) => row.id === first.id)?.parent === null
        ? names[0]
        : names[1];
    await page.reload();
    await expandSubjectSidebarRow(page, rootName);
    for (const name of names)
      await expect(getSubjectSidebarRow(page, name)).toBeVisible();
  });
});
