"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import type { FlashcardEntity, MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { actionError } from "@/lib/server-action-errors";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
  type DeleteFlashcardForm,
  deleteFlashcardSchema,
  type EditFlashcardForm,
  editFlashcardSchema,
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

export async function createFlashcard(
  data: CreateFlashcardForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = createFlashcardSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("flashcards.invalidData");
  }

  const existingSubject = await db
    .select({ id: subject.id, flashcardsEnabled: subject.flashcardsEnabled })
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

  if (!existingSubject[0].flashcardsEnabled) {
    return actionError("flashcards.moduleDisabled");
  }

  await db.insert(flashcard).values({
    subjectId: parsed.data.subjectId,
    userId,
    front: parsed.data.front,
    back: parsed.data.back,
  });

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { success: true };
}

export async function editFlashcard(
  data: EditFlashcardForm,
): Promise<MutationResult> {
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

  await db
    .update(flashcard)
    .set({
      front: parsed.data.front,
      back: parsed.data.back,
    })
    .where(and(eq(flashcard.id, parsed.data.id), eq(flashcard.userId, userId)));

  revalidatePath(`/subjects/${existingFlashcard[0].subjectId}`);
  return { success: true };
}

export async function deleteFlashcard(
  data: DeleteFlashcardForm,
): Promise<MutationResult> {
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
  return { success: true };
}
