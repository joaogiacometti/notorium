"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard } from "@/db/schema";
import { appEnv } from "@/env";
import {
  countFlashcardsBySubjectForUser,
  getFlashcardByIdForUser,
  getFlashcardRecordForUser,
  getFlashcardsBySubjectForUser,
} from "@/features/flashcards/queries";
import {
  revalidateFlashcardDetailPaths,
  revalidateFlashcardReviewPaths,
  revalidateFlashcardSubjectPaths,
} from "@/features/flashcards/revalidation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import { parseActionInput } from "@/lib/action-input";
import {
  mapAnkiImportCardToFlashcardInsert,
  parseAnkiImportFile,
} from "@/lib/anki-import";
import type {
  CreateFlashcardResult,
  DeleteFlashcardResult,
  EditFlashcardResult,
  FlashcardEntity,
  MutationResult,
  ResetFlashcardResult,
} from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getInitialFlashcardSchedulingState } from "@/lib/fsrs";
import { ensureFsrsSettings } from "@/lib/fsrs-settings";
import { LIMITS } from "@/lib/limits";
import { actionError } from "@/lib/server-action-errors";
import {
  type AnkiImportCard,
  importAnkiFlashcardsSchema,
} from "@/lib/validations/anki-import";
import {
  type CreateFlashcardForm as CreateFlashcardInput,
  createFlashcardSchema as createFlashcardInputSchema,
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
  await ensureFsrsSettings(userId);
  return getFlashcardsBySubjectForUser(userId, subjectId);
}

export async function getFlashcardById(
  id: string,
): Promise<FlashcardEntity | null> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getFlashcardByIdForUser(userId, id);
}

export async function createFlashcard(
  data: CreateFlashcardInput,
): Promise<CreateFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    createFlashcardInputSchema,
    data,
    "flashcards.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    parsed.data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countFlashcardsBySubjectForUser(
    userId,
    parsed.data.subjectId,
  );

  if (current >= LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }

  const schedulingState = getInitialFlashcardSchedulingState();
  const inserted = await db
    .insert(flashcard)
    .values({
      subjectId: parsed.data.subjectId,
      userId,
      front: parsed.data.front,
      back: parsed.data.back,
      state: schedulingState.state,
      dueAt: schedulingState.dueAt,
      stability: schedulingState.stability,
      difficulty: schedulingState.difficulty,
      ease: schedulingState.ease,
      intervalDays: schedulingState.intervalDays,
      learningStep: schedulingState.learningStep,
      lastReviewedAt: schedulingState.lastReviewedAt,
      reviewCount: schedulingState.reviewCount,
      lapseCount: schedulingState.lapseCount,
    })
    .returning();

  revalidateFlashcardSubjectPaths(parsed.data.subjectId);
  return { success: true, flashcard: inserted[0] };
}

export async function importAnkiFlashcards(
  formData: FormData,
): Promise<MutationResult & { imported?: number }> {
  const userId = await getAuthenticatedUserId();
  const subjectId = formData.get("subjectId");
  const file = formData.get("file");

  if (typeof subjectId !== "string" || !(file instanceof File)) {
    return actionError("flashcards.import.invalidFormat");
  }

  if (file.size === 0 || file.size > appEnv.MAX_IMPORT_BYTES) {
    return actionError("flashcards.import.invalidFormat");
  }

  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countFlashcardsBySubjectForUser(userId, subjectId);
  let parsedCards: AnkiImportCard[];

  try {
    parsedCards = await parseAnkiImportFile(file);
  } catch {
    return actionError("flashcards.import.invalidFormat");
  }

  const parsed = importAnkiFlashcardsSchema.safeParse({
    subjectId,
    cards: parsedCards,
  });

  if (!parsed.success) {
    return actionError("flashcards.import.invalidFormat");
  }

  if (parsed.data.cards.length === 0) {
    return actionError("flashcards.import.noCards");
  }

  const incoming = parsed.data.cards.length;

  if (current + incoming > LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }

  try {
    const now = new Date();

    await db.insert(flashcard).values(
      parsed.data.cards.map((cardData) => ({
        ...mapAnkiImportCardToFlashcardInsert(cardData, now),
        subjectId,
        userId,
      })),
    );
  } catch {
    return actionError("flashcards.import.failed");
  }

  revalidateFlashcardReviewPaths(subjectId);
  return { success: true, imported: incoming };
}

export async function editFlashcard(
  data: EditFlashcardForm,
): Promise<EditFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    editFlashcardSchema,
    data,
    "flashcards.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingFlashcard = await getFlashcardRecordForUser(
    userId,
    parsed.data.id,
  );

  if (!existingFlashcard) {
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

  revalidateFlashcardReviewPaths(existingFlashcard.subjectId, parsed.data.id);
  return { success: true, flashcard: updated[0] };
}

export async function deleteFlashcard(
  data: DeleteFlashcardForm,
): Promise<DeleteFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    deleteFlashcardSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingFlashcard = await getFlashcardRecordForUser(
    userId,
    parsed.data.id,
  );

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  await db
    .delete(flashcard)
    .where(and(eq(flashcard.id, parsed.data.id), eq(flashcard.userId, userId)));

  revalidateFlashcardDetailPaths(existingFlashcard.subjectId, parsed.data.id);
  return { success: true, id: parsed.data.id };
}

export async function resetFlashcard(
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    resetFlashcardSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingFlashcard = await getFlashcardRecordForUser(
    userId,
    parsed.data.id,
  );

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  const now = new Date();
  const schedulingState = getInitialFlashcardSchedulingState(now);

  const updated = await db
    .update(flashcard)
    .set({
      state: schedulingState.state,
      dueAt: schedulingState.dueAt,
      stability: schedulingState.stability,
      difficulty: schedulingState.difficulty,
      ease: schedulingState.ease,
      intervalDays: schedulingState.intervalDays,
      learningStep: schedulingState.learningStep,
      lastReviewedAt: schedulingState.lastReviewedAt,
      reviewCount: schedulingState.reviewCount,
      lapseCount: schedulingState.lapseCount,
      updatedAt: now,
    })
    .where(and(eq(flashcard.id, parsed.data.id), eq(flashcard.userId, userId)))
    .returning();

  revalidateFlashcardReviewPaths(existingFlashcard.subjectId, parsed.data.id);
  return { success: true, flashcard: updated[0] };
}
