import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { cleanupAttachmentsAfterMutation } from "@/features/attachments";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  countFlashcardsBySubjectForUser,
  getFlashcardByIdForUser,
  getFlashcardRecordForUser,
  hasDuplicateFlashcardFrontForUser,
} from "@/features/flashcards/queries";
import type {
  CreateFlashcardForm,
  DeleteFlashcardForm,
  EditFlashcardForm,
  ResetFlashcardForm,
} from "@/features/flashcards/validation";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { isUniqueViolationError } from "@/lib/db/errors";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import type {
  CreateFlashcardResult,
  EditFlashcardResult,
  FlashcardEntity,
  ResetFlashcardResult,
} from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type DeleteFlashcardMutationResult =
  | {
      success: true;
      id: string;
      subjectId: string | null;
    }
  | ActionErrorResult;

async function validateCreateFlashcardInput(
  userId: string,
  data: CreateFlashcardForm,
): Promise<
  { error: ActionErrorResult } | { subjectId: string; frontNormalized: string }
> {
  const frontNormalized = normalizeRichTextForUniqueness(data.front);

  const [existingSubject, currentCount, hasDuplicate] = await Promise.all([
    getSubjectRecordForUser(userId, data.subjectId),
    countFlashcardsBySubjectForUser(userId, data.subjectId),
    hasDuplicateFlashcardFrontForUser(userId, frontNormalized),
  ]);

  if (!existingSubject) {
    return { error: actionError("subjects.notFound") };
  }

  if (currentCount >= LIMITS.maxFlashcardsPerSubject) {
    return {
      error: actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      }),
    };
  }

  if (hasDuplicate) {
    return { error: actionError("flashcards.duplicateFront") };
  }

  return { subjectId: data.subjectId, frontNormalized };
}

async function createFlashcardRecord(
  userId: string,
  subjectId: string,
  data: CreateFlashcardForm,
  frontNormalized: string,
) {
  const schedulingState = getInitialFlashcardSchedulingState();

  const inserted = await getDb()
    .insert(flashcard)
    .values({
      subjectId,
      userId,
      front: data.front,
      frontNormalized,
      back: data.back,
      state: schedulingState.state,
      dueAt: schedulingState.dueAt,
      stability: schedulingState.stability,
      difficulty: schedulingState.difficulty,
      intervalDays: schedulingState.intervalDays,
      learningStep: schedulingState.learningStep,
      lastReviewedAt: schedulingState.lastReviewedAt,
      reviewCount: schedulingState.reviewCount,
      lapseCount: schedulingState.lapseCount,
    })
    .returning();

  return inserted[0];
}

export async function createFlashcardForUser(
  userId: string,
  data: CreateFlashcardForm,
): Promise<CreateFlashcardResult> {
  const validation = await validateCreateFlashcardInput(userId, data);

  if ("error" in validation) {
    return validation.error;
  }

  try {
    const flashcardRecord = await createFlashcardRecord(
      userId,
      validation.subjectId,
      data,
      validation.frontNormalized,
    );

    return { success: true, flashcard: flashcardRecord };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }

    throw error;
  }
}

type ValidateEditFlashcardResult =
  | { ok: true; frontNormalized: string; existingFlashcard: FlashcardEntity }
  | {
      ok: false;
      error: ActionErrorResult;
      existingFlashcard: FlashcardEntity | null;
    };

async function validateEditFlashcardInput(
  userId: string,
  data: EditFlashcardForm,
  existingFlashcard: FlashcardEntity,
): Promise<ValidateEditFlashcardResult> {
  const frontNormalized = normalizeRichTextForUniqueness(data.front);

  const [existingSubject, hasDuplicate] = await Promise.all([
    getSubjectRecordForUser(userId, data.subjectId),
    hasDuplicateFlashcardFrontForUser(userId, frontNormalized, data.id),
  ]);

  if (!existingSubject) {
    return {
      ok: false,
      error: actionError("subjects.notFound"),
      existingFlashcard,
    };
  }

  if (existingFlashcard.subjectId !== data.subjectId) {
    const current = await countFlashcardsBySubjectForUser(
      userId,
      data.subjectId,
    );

    if (current >= LIMITS.maxFlashcardsPerSubject) {
      return {
        ok: false,
        error: actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerSubject },
        }),
        existingFlashcard,
      };
    }
  }

  if (hasDuplicate) {
    return {
      ok: false,
      error: actionError("flashcards.duplicateFront"),
      existingFlashcard,
    };
  }

  return { ok: true, frontNormalized, existingFlashcard };
}

async function performFlashcardUpdate(
  userId: string,
  data: EditFlashcardForm,
  frontNormalized: string,
) {
  try {
    const updated = await getDb()
      .update(flashcard)
      .set({
        subjectId: data.subjectId,
        front: data.front,
        frontNormalized,
        back: data.back,
      })
      .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)))
      .returning();

    return { updatedFlashcard: updated[0], error: null };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return {
        updatedFlashcard: undefined,
        error: actionError("flashcards.duplicateFront"),
      };
    }

    throw error;
  }
}

export async function editFlashcardForUser(
  userId: string,
  data: EditFlashcardForm,
): Promise<EditFlashcardResult> {
  const existingFlashcard = await getFlashcardByIdForUser(userId, data.id);
  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  return updateFlashcardContent(userId, data, existingFlashcard);
}

async function updateFlashcardContent(
  userId: string,
  data: EditFlashcardForm,
  existingFlashcard: FlashcardEntity,
): Promise<EditFlashcardResult> {
  const validation = await validateEditFlashcardInput(
    userId,
    data,
    existingFlashcard,
  );

  if (!validation.ok) {
    return validation.error;
  }

  const { frontNormalized } = validation;
  const previousAttachmentValues = [
    existingFlashcard.front,
    existingFlashcard.back,
  ];

  const { updatedFlashcard, error } = await performFlashcardUpdate(
    userId,
    data,
    frontNormalized,
  );

  if (error) {
    return error;
  }

  if (!updatedFlashcard) {
    return actionError("flashcards.notFound");
  }

  await cleanupAttachmentsAfterMutation(userId, previousAttachmentValues, [
    data.front,
    data.back,
  ]);

  return {
    success: true,
    flashcard: updatedFlashcard,
    previousSubjectId: existingFlashcard.subjectId,
  };
}

export { generateFlashcardBackForUserInput } from "@/features/flashcards/back-generation";

export async function deleteFlashcardForUser(
  userId: string,
  data: DeleteFlashcardForm,
): Promise<DeleteFlashcardMutationResult> {
  const existingFlashcard = await getFlashcardByIdForUser(userId, data.id);

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  await getDb()
    .delete(flashcard)
    .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)));

  await cleanupAttachmentsAfterMutation(
    userId,
    [existingFlashcard.front, existingFlashcard.back],
    [],
  );

  return {
    success: true,
    id: data.id,
    subjectId: existingFlashcard.subjectId,
  };
}

export {
  bulkDeleteFlashcardsForUser,
  bulkMoveFlashcardsForUser,
  bulkResetFlashcardsForUser,
} from "@/features/flashcards/bulk-mutations";

export async function resetFlashcardForUser(
  userId: string,
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  const existingFlashcard = await getFlashcardRecordForUser(userId, data.id);

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  const now = new Date();
  const schedulingState = getInitialFlashcardSchedulingState(now);

  const updated = await getDb()
    .update(flashcard)
    .set({
      state: schedulingState.state,
      dueAt: schedulingState.dueAt,
      stability: schedulingState.stability,
      difficulty: schedulingState.difficulty,
      intervalDays: schedulingState.intervalDays,
      learningStep: schedulingState.learningStep,
      lastReviewedAt: schedulingState.lastReviewedAt,
      reviewCount: schedulingState.reviewCount,
      lapseCount: schedulingState.lapseCount,
      updatedAt: now,
    })
    .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)))
    .returning();

  return { success: true, flashcard: updated[0] };
}
