import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import {
  getFlashcardManageBackExcerpt,
  getFlashcardManageBackExcerptSourceLength,
} from "@/features/flashcards/manage-excerpts";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import type {
  FlashcardEntity,
  FlashcardListEntity,
  FlashcardManagePage,
} from "@/lib/server/api-contracts";

function escapeIlike(value: string): string {
  return value.replaceAll(/[\\%_]/g, String.raw`\$&`);
}

export async function getFlashcardsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<FlashcardEntity[]> {
  return db
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.subjectId, subjectId),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(desc(flashcard.updatedAt))
    .then((rows) => rows.map((row) => row.flashcard));
}

export async function getFlashcardsForUser(
  userId: string,
): Promise<FlashcardListEntity[]> {
  return db
    .select({ flashcard, subjectName: subject.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(desc(flashcard.updatedAt))
    .then((rows) =>
      rows.map((row) => ({
        ...row.flashcard,
        subjectName: row.subjectName,
      })),
    );
}

export async function getFlashcardsManagePageForUser(
  userId: string,
  { pageIndex, pageSize, subjectId, search }: FlashcardsManageQueryInput,
): Promise<FlashcardManagePage> {
  const normalizedSearch = search?.trim() ?? "";
  const searchPattern = `%${escapeIlike(normalizedSearch)}%`;
  const offset = pageIndex * pageSize;
  const backExcerptSourceLength = getFlashcardManageBackExcerptSourceLength();
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(subject.userId, userId),
    isNull(subject.archivedAt),
  ];

  if (subjectId) {
    filters.push(eq(flashcard.subjectId, subjectId));
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
    db
      .select({
        id: flashcard.id,
        subjectId: flashcard.subjectId,
        updatedAt: flashcard.updatedAt,
        front: flashcard.front,
        back: sql<string>`left(${flashcard.back}, ${backExcerptSourceLength})`,
        subjectName: subject.name,
      })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...totalFilters))
      .orderBy(desc(flashcard.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...totalFilters)),
    subjectId
      ? db
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
      updatedAt: row.updatedAt,
      front: row.front,
      backExcerpt: getFlashcardManageBackExcerpt(row.back),
      subjectName: row.subjectName,
    })),
    total: totalRows[0]?.total ?? 0,
    subjectCardCount: subjectId ? (subjectCountRows[0]?.total ?? 0) : null,
  };
}

export async function getFlashcardByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardEntity | null> {
  const results = await db
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, flashcardId),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0]?.flashcard ?? null;
}

export async function getFlashcardRecordForUser(
  userId: string,
  flashcardId: string,
): Promise<Pick<FlashcardEntity, "id" | "subjectId"> | null> {
  const results = await db
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, flashcardId),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
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

  return db
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        inArray(flashcard.id, flashcardIds),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );
}

export async function countFlashcardsBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await db
    .select({ total: count() })
    .from(flashcard)
    .where(
      and(eq(flashcard.subjectId, subjectId), eq(flashcard.userId, userId)),
    );

  return result[0]?.total ?? 0;
}
