import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { uniqueItems } from "@/lib/utils";

async function getSelectedNoteIds(userId: string, ids: string[]) {
  return getDb()
    .select({
      clozeNoteId: flashcard.clozeNoteId,
      occlusionNoteId: flashcard.occlusionNoteId,
    })
    .from(flashcard)
    .where(and(inArray(flashcard.id, ids), eq(flashcard.userId, userId)));
}

function collectNoteIds(
  rows: Awaited<ReturnType<typeof getSelectedNoteIds>>,
  key: "clozeNoteId" | "occlusionNoteId",
): string[] {
  return uniqueItems(
    rows
      .map((row) => row[key])
      .filter((noteId): noteId is string => noteId !== null),
  );
}

async function getSiblingIds(
  userId: string,
  filters: SQL<unknown>[],
): Promise<string[]> {
  if (filters.length === 0) {
    return [];
  }

  const rows = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(and(eq(flashcard.userId, userId), or(...filters)));
  return rows.map((row) => row.id);
}

/**
 * Expands ids so selecting any cloze or occlusion card includes its whole note.
 *
 * @example
 * const ids = await expandFlashcardNoteSiblingIds(userId, selectedIds);
 */
export async function expandFlashcardNoteSiblingIds(
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows = await getSelectedNoteIds(userId, ids);
  const clozeNoteIds = collectNoteIds(rows, "clozeNoteId");
  const occlusionNoteIds = collectNoteIds(rows, "occlusionNoteId");
  const filters: SQL<unknown>[] = [];

  if (clozeNoteIds.length > 0) {
    filters.push(inArray(flashcard.clozeNoteId, clozeNoteIds));
  }
  if (occlusionNoteIds.length > 0) {
    filters.push(inArray(flashcard.occlusionNoteId, occlusionNoteIds));
  }

  const siblingIds = await getSiblingIds(userId, filters);
  return uniqueItems([...ids, ...siblingIds]);
}

/**
 * Expands ids so resetting one occlusion mask resets its complete image note.
 *
 * @example
 * const ids = await expandOcclusionSiblingIds(userId, selectedIds);
 */
export async function expandOcclusionSiblingIds(
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows = await getSelectedNoteIds(userId, ids);
  const noteIds = collectNoteIds(rows, "occlusionNoteId");
  const filters =
    noteIds.length > 0 ? [inArray(flashcard.occlusionNoteId, noteIds)] : [];
  const siblingIds = await getSiblingIds(userId, filters);
  return uniqueItems([...ids, ...siblingIds]);
}
