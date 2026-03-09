import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

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
