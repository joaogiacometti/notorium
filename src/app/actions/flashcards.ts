"use server";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import type {
  CreateFlashcardResult,
  DeleteFlashcardResult,
  EditFlashcardResult,
  FlashcardEntity,
  ResetFlashcardResult,
} from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { LIMITS } from "@/lib/limits";
import { actionError } from "@/lib/server-action-errors";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
  type DeleteFlashcardForm,
  deleteFlashcardSchema,
  type EditFlashcardForm,
  editFlashcardSchema,
  type ResetFlashcardForm,
  resetFlashcardSchema,
} from "@/lib/validations/flashcards";

export async function getFlashcardsBySubject(
  subjectId: string,
): Promise<FlashcardEntity[]> {
  const userId = await getAuthenticatedUserId();

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

export async function getFlashcardById(
  id: string,
): Promise<FlashcardEntity | null> {
  const userId = await getAuthenticatedUserId();

  const results = await db
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, id),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0]?.flashcard ?? null;
}

export async function createFlashcard(
  data: CreateFlashcardForm,
): Promise<CreateFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = createFlashcardSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("flashcards.invalidData");
  }

  const existingSubject = await db
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.subjectId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existingSubject.length === 0) {
    return actionError("subjects.notFound");
  }

  const result = await db
    .select({ total: count() })
    .from(flashcard)
    .where(
      and(
        eq(flashcard.subjectId, parsed.data.subjectId),
        eq(flashcard.userId, userId),
      ),
    );

  const current = result[0]?.total ?? 0;

  if (current >= LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }

  const inserted = await db
    .insert(flashcard)
    .values({
      subjectId: parsed.data.subjectId,
      userId,
      front: parsed.data.front,
      back: parsed.data.back,
    })
    .returning();

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { success: true, flashcard: inserted[0] };
}

export async function editFlashcard(
  data: EditFlashcardForm,
): Promise<EditFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = editFlashcardSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("flashcards.invalidData");
  }

  const existingFlashcard = await db
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, parsed.data.id),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existingFlashcard.length === 0) {
    return actionError("flashcards.notFound");
  }

  const updated = await db
    .update(flashcard)
    .set({
      front: parsed.data.front,
      back: parsed.data.back,
    })
    .where(and(eq(flashcard.id, parsed.data.id), eq(flashcard.userId, userId)))
    .returning();

  revalidatePath(`/subjects/${existingFlashcard[0].subjectId}`);
  revalidatePath(
    `/subjects/${existingFlashcard[0].subjectId}/flashcards/${parsed.data.id}`,
  );
  revalidatePath("/flashcards/review");
  return { success: true, flashcard: updated[0] };
}

export async function deleteFlashcard(
  data: DeleteFlashcardForm,
): Promise<DeleteFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteFlashcardSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("common.invalidRequest");
  }

  const existingFlashcard = await db
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, parsed.data.id),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existingFlashcard.length === 0) {
    return actionError("flashcards.notFound");
  }

  await db
    .delete(flashcard)
    .where(and(eq(flashcard.id, parsed.data.id), eq(flashcard.userId, userId)));

  revalidatePath(`/subjects/${existingFlashcard[0].subjectId}`);
  revalidatePath(
    `/subjects/${existingFlashcard[0].subjectId}/flashcards/${parsed.data.id}`,
  );
  return { success: true, id: parsed.data.id };
}

export async function resetFlashcard(
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = resetFlashcardSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("common.invalidRequest");
  }

  const existingFlashcard = await db
    .select({ id: flashcard.id, subjectId: flashcard.subjectId })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, parsed.data.id),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existingFlashcard.length === 0) {
    return actionError("flashcards.notFound");
  }

  const now = new Date();

  const updated = await db
    .update(flashcard)
    .set({
      state: "new",
      dueAt: now,
      ease: 250,
      intervalDays: 0,
      learningStep: null,
      lastReviewedAt: null,
      reviewCount: 0,
      lapseCount: 0,
      updatedAt: now,
    })
    .where(and(eq(flashcard.id, parsed.data.id), eq(flashcard.userId, userId)))
    .returning();

  revalidatePath(`/subjects/${existingFlashcard[0].subjectId}`);
  revalidatePath(
    `/subjects/${existingFlashcard[0].subjectId}/flashcards/${parsed.data.id}`,
  );
  revalidatePath("/flashcards/review");
  return { success: true, flashcard: updated[0] };
}
