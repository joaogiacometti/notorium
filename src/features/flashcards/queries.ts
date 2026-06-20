import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import {
  getAllSubjectsWithPathsForUser,
  getDescendantSubjectIds,
  getSubjectPathForUser,
} from "@/features/subjects/queries";
import {
  getRichTextExcerpt,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type {
  FlashcardDetailEntity,
  FlashcardEntity,
  FlashcardListEntity,
  FlashcardManagePage,
} from "@/lib/server/api-contracts";
import { uniqueItems } from "@/lib/utils";

async function getSubjectPathMapForUser(
  userId: string,
): Promise<Map<string, string>> {
  const subjects = await getAllSubjectsWithPathsForUser(userId);
  return new Map(
    subjects.map((currentSubject) => [currentSubject.id, currentSubject.path]),
  );
}

async function resolveScopedSubjectIds(
  userId: string,
  subjectId?: string,
  subjectIds?: string[],
): Promise<string[] | undefined> {
  if (subjectIds && subjectIds.length > 0) {
    return subjectIds;
  }

  if (!subjectId) {
    return undefined;
  }

  return getDescendantSubjectIds(userId, subjectId);
}

export function getFlashcardsManageOrderBy(
  normalizedSearch: string,
  searchPattern: string,
): SQL<unknown>[] {
  if (normalizedSearch.length === 0) {
    return [desc(flashcard.updatedAt)];
  }

  return [
    sql<number>`case
      when ${flashcard.front} ilike ${searchPattern} then 0
      when ${flashcard.back} ilike ${searchPattern} then 1
      when ${subject.name} ilike ${searchPattern} then 2
      else 3
    end`,
    desc(flashcard.updatedAt),
  ];
}

export async function getFlashcardsForUser(
  userId: string,
): Promise<FlashcardListEntity[]> {
  const [rows, subjectPathMap] = await Promise.all([
    getDb()
      .select({ flashcard, subjectName: subject.name })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(eq(flashcard.userId, userId))
      .orderBy(desc(flashcard.updatedAt)),
    getSubjectPathMapForUser(userId),
  ]);

  return rows.map((row) => ({
    ...row.flashcard,
    subjectName: row.subjectName,
    subjectPath:
      (row.flashcard.subjectId
        ? subjectPathMap.get(row.flashcard.subjectId)
        : undefined) ?? row.subjectName,
  }));
}

// Keep one representative row per occlusion note (its lowest mask id) so the
// manage list shows one entry per image instead of one per mask. Non-occlusion
// cards are always kept.
const occlusionRepresentativeFilter = sql`(
  ${flashcard.type} <> 'occlusion'
  or ${flashcard.id} = (
    select min(sub.id) from flashcard as sub
    where sub.occlusion_note_id = ${flashcard.occlusionNoteId}
  )
)`;

const occlusionMaskCount = sql<number>`(
  select count(*)::int from flashcard as cnt
  where cnt.occlusion_note_id = ${flashcard.occlusionNoteId}
)`;

export async function getFlashcardsManagePageForUser(
  userId: string,
  {
    pageIndex,
    pageSize,
    subjectId,
    subjectIds,
    search,
  }: FlashcardsManageQueryInput,
): Promise<FlashcardManagePage> {
  const normalizedSearch = search?.trim() ?? "";
  const searchPattern = buildContainsSearchPattern(normalizedSearch);
  const offset = pageIndex * pageSize;
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    occlusionRepresentativeFilter,
  ];
  const scopedSubjectIds = await resolveScopedSubjectIds(
    userId,
    subjectId,
    subjectIds,
  );

  if (scopedSubjectIds && scopedSubjectIds.length > 0) {
    filters.push(inArray(flashcard.subjectId, scopedSubjectIds));
  }

  const totalFilters =
    normalizedSearch.length > 0
      ? [
          ...filters,
          or(
            ilike(flashcard.front, searchPattern),
            ilike(flashcard.back, searchPattern),
            ilike(subject.name, searchPattern),
          ),
        ]
      : filters;

  const [itemRows, totalRows, subjectCountRows, subjectPathMap] =
    await Promise.all([
      getDb()
        .select({
          id: flashcard.id,
          subjectId: flashcard.subjectId,
          updatedAt: flashcard.updatedAt,
          front: flashcard.front,
          type: flashcard.type,
          occlusionImagePathname: flashcard.occlusionImagePathname,
          maskCount: occlusionMaskCount,
          subjectName: subject.name,
        })
        .from(flashcard)
        .innerJoin(subject, eq(flashcard.subjectId, subject.id))
        .where(and(...totalFilters))
        .orderBy(...getFlashcardsManageOrderBy(normalizedSearch, searchPattern))
        .limit(pageSize)
        .offset(offset),
      getDb()
        .select({ total: count() })
        .from(flashcard)
        .innerJoin(subject, eq(flashcard.subjectId, subject.id))
        .where(and(...totalFilters)),
      subjectId
        ? getDb()
            .select({ total: count() })
            .from(flashcard)
            .where(
              and(
                eq(flashcard.userId, userId),
                eq(flashcard.subjectId, subjectId),
              ),
            )
        : Promise.resolve([]),
      getSubjectPathMapForUser(userId),
    ]);

  return {
    items: itemRows.map((row) => ({
      id: row.id,
      subjectId: row.subjectId,
      updatedAt: row.updatedAt,
      front: row.front,
      frontExcerpt: getRichTextExcerpt(row.front, 45),
      frontTitle: richTextToPlainText(row.front) || null,
      type: row.type,
      occlusionImagePathname:
        row.type === "occlusion" ? row.occlusionImagePathname : null,
      maskCount: row.type === "occlusion" ? row.maskCount : null,
      subjectName: row.subjectName,
      subjectPath:
        (row.subjectId ? subjectPathMap.get(row.subjectId) : undefined) ??
        row.subjectName,
    })),
    total: totalRows[0]?.total ?? 0,
    subjectCardCount: subjectId ? (subjectCountRows[0]?.total ?? 0) : null,
  };
}

export async function getFlashcardByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardEntity | null> {
  const results = await getDb()
    .select({ flashcard })
    .from(flashcard)
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  return results[0]?.flashcard ?? null;
}

/**
 * Loads every sibling card of a cloze note, ordered by deletion ordinal.
 *
 * @example
 * const siblings = await getClozeSiblingsForUser(userId, "note-123");
 */
export async function getClozeSiblingsForUser(
  userId: string,
  clozeNoteId: string,
): Promise<FlashcardEntity[]> {
  const results = await getDb()
    .select({ flashcard })
    .from(flashcard)
    .where(
      and(eq(flashcard.clozeNoteId, clozeNoteId), eq(flashcard.userId, userId)),
    )
    .orderBy(flashcard.clozeOrdinal);

  return results.map((row) => row.flashcard);
}

/**
 * Loads every sibling card of an image occlusion note, ordered by id for a
 * stable representative pick.
 *
 * @example
 * const siblings = await getOcclusionSiblingsForUser(userId, "note-123");
 */
export async function getOcclusionSiblingsForUser(
  userId: string,
  occlusionNoteId: string,
): Promise<FlashcardEntity[]> {
  const results = await getDb()
    .select({ flashcard })
    .from(flashcard)
    .where(
      and(
        eq(flashcard.occlusionNoteId, occlusionNoteId),
        eq(flashcard.userId, userId),
      ),
    )
    .orderBy(flashcard.id);

  return results.map((row) => row.flashcard);
}

/**
 * Expands a set of flashcard ids so that any occlusion card pulls in all of its
 * note's sibling masks. Lets note-level bulk actions (move, reset, delete) act
 * on the whole image even when only its representative row was selected.
 *
 * @example
 * const ids = await expandOcclusionSiblingIds(userId, [representativeMaskId]);
 */
export async function expandOcclusionSiblingIds(
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await getDb()
    .select({ occlusionNoteId: flashcard.occlusionNoteId })
    .from(flashcard)
    .where(
      and(
        inArray(flashcard.id, ids),
        eq(flashcard.userId, userId),
        eq(flashcard.type, "occlusion"),
      ),
    );
  const noteIds = uniqueItems(
    rows
      .map((row) => row.occlusionNoteId)
      .filter((noteId): noteId is string => noteId !== null),
  );
  if (noteIds.length === 0) {
    return ids;
  }
  const siblings = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(
      and(
        inArray(flashcard.occlusionNoteId, noteIds),
        eq(flashcard.userId, userId),
      ),
    );
  return uniqueItems([...ids, ...siblings.map((row) => row.id)]);
}

export async function getFlashcardDetailByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardDetailEntity | null> {
  const results = await getDb()
    .select({ flashcard, subjectName: subject.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  const result = results[0];
  if (!result) {
    return null;
  }

  // Resolve only this card's subject path (one ancestor-chain walk) rather than
  // materializing the whole library's path map just to read a single entry.
  const subjectPath = result.flashcard.subjectId
    ? await getSubjectPathForUser(userId, result.flashcard.subjectId)
    : "";

  return {
    ...result.flashcard,
    subjectName: result.subjectName,
    subjectPath: subjectPath || result.subjectName,
  };
}

export async function getFlashcardRecordForUser(
  userId: string,
  flashcardId: string,
): Promise<Pick<FlashcardEntity, "id" | "subjectId"> | null> {
  const results = await getDb()
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getFlashcardRecordsForUser(
  userId: string,
  flashcardIds: string[],
): Promise<Array<Pick<FlashcardEntity, "id" | "subjectId">>> {
  if (flashcardIds.length === 0) {
    return [];
  }

  return getDb()
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .where(
      and(inArray(flashcard.id, flashcardIds), eq(flashcard.userId, userId)),
    );
}

export async function countFlashcardsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(flashcard)
    .where(
      and(eq(flashcard.subjectId, subjectId), eq(flashcard.userId, userId)),
    );

  return result[0]?.total ?? 0;
}

export async function hasDuplicateFlashcardFrontForUser(
  userId: string,
  frontNormalized: string,
  excludedFlashcardId?: string,
): Promise<boolean> {
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(flashcard.frontNormalized, frontNormalized),
  ];

  if (excludedFlashcardId) {
    filters.push(ne(flashcard.id, excludedFlashcardId));
  }

  const result = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(and(...filters))
    .limit(1);

  return result.length > 0;
}

export async function getFlashcardsByIdsForValidation(
  userId: string,
  flashcardIds: string[],
): Promise<
  Array<{
    id: string;
    front: string;
    back: string;
    subjectName: string;
    subjectPath?: string;
    subjectId: string | null;
  }>
> {
  if (flashcardIds.length === 0) {
    return [];
  }

  const [results, subjectPathMap] = await Promise.all([
    getDb()
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        subjectName: subject.name,
        subjectId: flashcard.subjectId,
      })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(
        and(inArray(flashcard.id, flashcardIds), eq(flashcard.userId, userId)),
      ),
    getSubjectPathMapForUser(userId),
  ]);

  return results.map((result) => ({
    ...result,
    subjectPath:
      (result.subjectId ? subjectPathMap.get(result.subjectId) : undefined) ??
      result.subjectName,
  }));
}

export async function getAllFlashcardIdsForUser(
  userId: string,
): Promise<string[]> {
  const results = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(eq(flashcard.userId, userId))
    .orderBy(desc(flashcard.updatedAt));

  return results.map((row) => row.id);
}

export async function getAllFlashcardIdsForSubject(
  userId: string,
  subjectId: string,
): Promise<string[]> {
  const scopedSubjectIds = await resolveScopedSubjectIds(userId, subjectId);

  if (!scopedSubjectIds || scopedSubjectIds.length === 0) {
    return [];
  }

  const results = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(
      and(
        eq(flashcard.userId, userId),
        inArray(flashcard.subjectId, scopedSubjectIds),
      ),
    )
    .orderBy(desc(flashcard.updatedAt));

  return results.map((row) => row.id);
}
