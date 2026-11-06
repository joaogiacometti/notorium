import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  countFlashcardsByFolderForUser,
  getFlashcardByIdForUser,
  getFlashcardRecordForUser,
} from "@/features/flashcards/queries";
import { readOwnedFlashcardSource } from "@/features/flashcards/source-queries";
import type {
  CreateFlashcardForm,
  DeleteFlashcardForm,
  EditFlashcardForm,
  ResetFlashcardForm,
} from "@/features/flashcards/validation";
import { getFolderRecordForUser } from "@/features/folders/queries";
import { LIMITS } from "@/lib/config/limits";
import { isUniqueViolationError } from "@/lib/db/errors";
import { documentText } from "@/lib/editor/document";
import { documentUniquenessText } from "@/lib/editor/document-content";
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
      folderId: string | null;
    }
  | ActionErrorResult;

async function validateCreateFlashcardInput(
  userId: string,
  data: CreateFlashcardForm,
): Promise<
  { error: ActionErrorResult } | { folderId: string; frontNormalized: string }
> {
  const frontNormalized = documentUniquenessText(data.front);

  const [existingFolder, currentCount, ownedSource] = await Promise.all([
    getFolderRecordForUser(userId, data.folderId),
    countFlashcardsByFolderForUser(userId, data.folderId),
    data.source ? readOwnedFlashcardSource(userId, data.source) : null,
  ]);

  if (!existingFolder) {
    return { error: actionError("folders.notFound") };
  }

  if (currentCount >= LIMITS.maxFlashcardsPerFolder) {
    return {
      error: actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerFolder },
      }),
    };
  }

  if (data.source && !ownedSource) {
    return { error: actionError(`${data.source.kind}s.notFound`) };
  }

  return { folderId: data.folderId, frontNormalized };
}

async function createFlashcardRecord(
  userId: string,
  folderId: string,
  data: CreateFlashcardForm,
  frontNormalized: string,
) {
  const schedulingState = getInitialFlashcardSchedulingState();

  const inserted = await getDb()
    .insert(flashcard)
    .values({
      folderId,
      userId,
      front: data.front,
      frontText: documentText(data.front),
      frontNormalized,
      back: data.back,
      backText: documentText(data.back),
      sourceNoteId: data.source?.kind === "note" ? data.source.id : null,
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
      validation.folderId,
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
  const frontNormalized = documentUniquenessText(data.front);

  const existingFolder = await getFolderRecordForUser(userId, data.folderId);

  if (!existingFolder) {
    return {
      ok: false,
      error: actionError("folders.notFound"),
      existingFlashcard,
    };
  }

  if (existingFlashcard.folderId !== data.folderId) {
    const current = await countFlashcardsByFolderForUser(userId, data.folderId);

    if (current >= LIMITS.maxFlashcardsPerFolder) {
      return {
        ok: false,
        error: actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerFolder },
        }),
        existingFlashcard,
      };
    }
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
        folderId: data.folderId,
        front: data.front,
        frontText: documentText(data.front),
        frontNormalized,
        back: data.back,
        backText: documentText(data.back),
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

  return {
    success: true,
    flashcard: updatedFlashcard,
    previousFolderId: existingFlashcard.folderId,
  };
}

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

  return {
    success: true,
    id: data.id,
    folderId: existingFlashcard.folderId,
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
