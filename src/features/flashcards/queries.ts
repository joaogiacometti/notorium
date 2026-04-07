import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard, subject } from "@/db/schema";
import {
  getFlashcardManageBackExcerpt,
  getFlashcardManageBackExcerptSourceLength,
} from "@/features/flashcards/manage-excerpts";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type {
  FlashcardEntity,
  FlashcardListEntity,
  FlashcardManagePage,
} from "@/lib/server/api-contracts";

export async function getFlashcardsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<FlashcardEntity[]> {
  return getDb()
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.subjectId, subjectId),
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(flashcard.updatedAt))
    .then((rows) => rows.map((row) => row.flashcard));
}

export async function getFlashcardsForUser(
  userId: string,
): Promise<FlashcardListEntity[]> {
  return getDb()
    .select({ flashcard, subjectName: subject.name, deckName: deck.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .leftJoin(deck, eq(flashcard.deckId, deck.id))
    .where(
      and(
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(flashcard.updatedAt))
    .then((rows) =>
      rows.map((row) => ({
        ...row.flashcard,
        subjectName: row.subjectName,
        deckName: row.deckName,
      })),
    );
}

export async function getFlashcardsManagePageForUser(
  userId: string,
  {
    pageIndex,
    pageSize,
    subjectId,
    deckId,
    search,
  }: FlashcardsManageQueryInput,
): Promise<FlashcardManagePage> {
  const normalizedSearch = search?.trim() ?? "";
  const searchPattern = buildContainsSearchPattern(normalizedSearch);
  const offset = pageIndex * pageSize;
  const backExcerptSourceLength = getFlashcardManageBackExcerptSourceLength();
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    ...getOwnedActiveSubjectFilters(userId),
  ];

  if (subjectId) {
    filters.push(eq(flashcard.subjectId, subjectId));
  }

  if (deckId) {
    filters.push(eq(flashcard.deckId, deckId));
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

  const [itemRows, totalRows, subjectCountRows] = await Promise.all([
    getDb()
      .select({
        id: flashcard.id,
        subjectId: flashcard.subjectId,
        deckId: flashcard.deckId,
        updatedAt: flashcard.updatedAt,
        front: flashcard.front,
        back: sql<string>`left(${flashcard.back}, ${backExcerptSourceLength})`,
        subjectName: subject.name,
        deckName: deck.name,
      })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .leftJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(...totalFilters))
      .orderBy(desc(flashcard.updatedAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .leftJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(...totalFilters)),
    subjectId
      ? getDb()
          .select({ total: count() })
          .from(flashcard)
          .innerJoin(subject, eq(flashcard.subjectId, subject.id))
          .where(
            and(
              eq(flashcard.userId, userId),
              eq(subject.userId, userId),
              isNull(subject.archivedAt),
              eq(flashcard.subjectId, subjectId),
            ),
          )
      : Promise.resolve([]),
  ]);

  return {
    items: itemRows.map((row) => ({
      id: row.id,
      subjectId: row.subjectId,
      deckId: row.deckId,
      updatedAt: row.updatedAt,
      front: row.front,
      backExcerpt: getFlashcardManageBackExcerpt(row.back),
      subjectName: row.subjectName,
      deckName: row.deckName,
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
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, flashcardId),
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0]?.flashcard ?? null;
}

export async function getFlashcardRecordForUser(
  userId: string,
  flashcardId: string,
): Promise<Pick<FlashcardEntity, "id" | "subjectId"> | null> {
  const results = await getDb()
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, flashcardId),
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
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
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        inArray(flashcard.id, flashcardIds),
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    );
}

export async function countFlashcardsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.subjectId, subjectId),
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
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
    ...getOwnedActiveSubjectFilters(userId),
  ];

  if (excludedFlashcardId) {
    filters.push(ne(flashcard.id, excludedFlashcardId));
  }

  const result = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
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
    subjectId: string;
  }>
> {
  if (flashcardIds.length === 0) {
    return [];
  }

  const results = await getDb()
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
      and(
        inArray(flashcard.id, flashcardIds),
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    );

  return results;
}

export async function getAllFlashcardIdsForUser(
  userId: string,
): Promise<string[]> {
  const results = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(flashcard.updatedAt));

  return results.map((row) => row.id);
}

export async function getAllFlashcardIdsForSubject(
  userId: string,
  subjectId: string,
): Promise<string[]> {
  const results = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.userId, userId),
        eq(flashcard.subjectId, subjectId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(flashcard.updatedAt));

  return results.map((row) => row.id);
}
