import {
  and,
  count,
  desc,
  eq,
  inArray,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import { attachFlashcardSources } from "@/features/flashcards/source-queries";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import { foldedContains } from "@/features/search/match-sql";
import {
  getDescendantSubjectIds,
  getSubjectPathForUser,
  getSubjectPathMapForUser,
} from "@/features/subjects/queries";
import {
  getRichTextExcerpt,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type {
  FlashcardContentItem,
  FlashcardDetailEntity,
  FlashcardEntity,
  FlashcardManagePage,
  FlashcardWithSourceEntity,
} from "@/lib/server/api-contracts";

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
      when ${foldedContains(flashcard.front, searchPattern)} then 0
      when ${foldedContains(flashcard.back, searchPattern)} then 1
      when ${foldedContains(subject.name, searchPattern)} then 2
      else 3
    end`,
    desc(flashcard.updatedAt),
  ];
}

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
  const filters: SQL<unknown>[] = [eq(flashcard.userId, userId)];
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
            foldedContains(flashcard.front, searchPattern),
            foldedContains(flashcard.back, searchPattern),
            foldedContains(subject.name, searchPattern),
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
 * Load one owned card with its current source link for the edit dialog.
 *
 * @example
 * const card = await getFlashcardWithSourceByIdForUser(userId, flashcardId);
 */
export async function getFlashcardWithSourceByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardWithSourceEntity | null> {
  const card = await getFlashcardByIdForUser(userId, flashcardId);
  if (!card) {
    return null;
  }

  const [cardWithSource] = await attachFlashcardSources(userId, [card]);
  return cardWithSource;
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
  // materializing the whole subject path map just to read a single entry.
  const [subjectPath, [cardWithSource]] = await Promise.all([
    result.flashcard.subjectId
      ? getSubjectPathForUser(userId, result.flashcard.subjectId)
      : "",
    attachFlashcardSources(userId, [result.flashcard]),
  ]);
  return {
    ...cardWithSource,
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

/**
 * Loads the full content and subject path of the given owned flashcards. Ids
 * the user does not own are skipped; rows come back in no particular order.
 *
 * @example
 * const cards = await getFlashcardContentsForUser(userId, ["card-1", "card-2"]);
 */
export async function getFlashcardContentsForUser(
  userId: string,
  flashcardIds: string[],
): Promise<FlashcardContentItem[]> {
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
    subjectPath: subjectPathMap.get(result.subjectId) ?? result.subjectName,
  }));
}
