import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { cleanupAttachmentPathnames } from "@/features/attachments/cleanup";
import { getRemovedAttachmentPathnames } from "@/features/attachments/utils";
import { getDeckRecordForUser } from "@/features/decks/queries";
import {
  generateFlashcardBackForUser,
  improveFlashcardBackForUser,
} from "@/features/flashcards/ai-service";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  countFlashcardsByDeckForUser,
  getFlashcardByIdForUser,
  getFlashcardRecordForUser,
  getFlashcardRecordsForUser,
  hasDuplicateFlashcardFrontForUser,
} from "@/features/flashcards/queries";
import type {
  BulkDeleteFlashcardsForm,
  BulkMoveFlashcardsForm,
  BulkResetFlashcardsForm,
  CreateFlashcardForm,
  DeleteFlashcardForm,
  EditFlashcardForm,
  GenerateFlashcardBackForm,
  ResetFlashcardForm,
} from "@/features/flashcards/validation";
import { LIMITS } from "@/lib/config/limits";
import { isUniqueViolationError } from "@/lib/db/errors";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import type {
  BulkDeleteFlashcardsResult,
  BulkMoveFlashcardsResult,
  BulkResetFlashcardsResult,
  CreateFlashcardResult,
  EditFlashcardResult,
  GenerateFlashcardBackResult,
  ResetFlashcardResult,
} from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";
import { uniqueItems } from "@/lib/utils";

export type DeleteFlashcardMutationResult =
  | {
      success: true;
      id: string;
      deckId: string;
    }
  | ActionErrorResult;
export async function createFlashcardForUser(
  userId: string,
  data: CreateFlashcardForm,
): Promise<CreateFlashcardResult> {
  const frontNormalized = normalizeRichTextForUniqueness(data.front);

  const [existingDeck, currentCount, hasDuplicate] = await Promise.all([
    getDeckRecordForUser(userId, data.deckId),
    countFlashcardsByDeckForUser(userId, data.deckId),
    hasDuplicateFlashcardFrontForUser(userId, frontNormalized),
  ]);

  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  if (currentCount >= LIMITS.maxFlashcardsPerDeck) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerDeck },
    });
  }

  if (hasDuplicate) {
    return actionError("flashcards.duplicateFront");
  }

  const schedulingState = getInitialFlashcardSchedulingState();
  try {
    const inserted = await getDb()
      .insert(flashcard)
      .values({
        deckId: data.deckId,
        userId,
        front: data.front,
        frontNormalized,
        back: data.back,
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

    return { success: true, flashcard: inserted[0] };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }

    throw error;
  }
}

export async function editFlashcardForUser(
  userId: string,
  data: EditFlashcardForm,
): Promise<EditFlashcardResult> {
  const frontNormalized = normalizeRichTextForUniqueness(data.front);

  const [existingFlashcard, existingDeck, hasDuplicate] = await Promise.all([
    getFlashcardByIdForUser(userId, data.id),
    getDeckRecordForUser(userId, data.deckId),
    hasDuplicateFlashcardFrontForUser(userId, frontNormalized, data.id),
  ]);

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  if (existingFlashcard.deckId !== data.deckId) {
    const current = await countFlashcardsByDeckForUser(userId, data.deckId);

    if (current >= LIMITS.maxFlashcardsPerDeck) {
      return actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerDeck },
      });
    }
  }

  if (hasDuplicate) {
    return actionError("flashcards.duplicateFront");
  }

  const previousAttachmentValues = [
    existingFlashcard.front,
    existingFlashcard.back,
  ];

  let updatedFlashcard: typeof existingFlashcard | undefined;

  try {
    const updated = await getDb()
      .update(flashcard)
      .set({
        deckId: data.deckId,
        front: data.front,
        frontNormalized,
        back: data.back,
      })
      .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)))
      .returning();

    updatedFlashcard = updated[0];
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }

    throw error;
  }

  if (!updatedFlashcard) {
    return actionError("flashcards.notFound");
  }

  const removedPathnames = getRemovedAttachmentPathnames(
    previousAttachmentValues,
    [data.front, data.back],
  );
  await cleanupAttachmentPathnames(userId, removedPathnames);

  return {
    success: true,
    flashcard: updatedFlashcard,
    previousDeckId: existingFlashcard.deckId,
  };
}

function mapAiServiceResult(
  result:
    | { success: true; back: string }
    | { success: false; errorCode: string },
): GenerateFlashcardBackResult {
  if (!result.success) {
    return actionError(result.errorCode);
  }

  return { success: true, back: result.back };
}

export async function generateFlashcardBackForUserInput(
  userId: string,
  data: GenerateFlashcardBackForm,
): Promise<GenerateFlashcardBackResult> {
  const existingDeck = await getDeckRecordForUser(userId, data.deckId);

  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  if (data.currentBack) {
    const result = await improveFlashcardBackForUser({
      userId,
      deckName: existingDeck.name,
      front: data.front,
      currentBack: data.currentBack,
    });

    return mapAiServiceResult(result);
  }

  const result = await generateFlashcardBackForUser({
    userId,
    deckName: existingDeck.name,
    front: data.front,
  });

  return mapAiServiceResult(result);
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

  const removedPathnames = getRemovedAttachmentPathnames(
    [existingFlashcard.front, existingFlashcard.back],
    [],
  );
  await cleanupAttachmentPathnames(userId, removedPathnames);

  return { success: true, id: data.id, deckId: existingFlashcard.deckId };
}

export async function bulkDeleteFlashcardsForUser(
  userId: string,
  data: BulkDeleteFlashcardsForm,
): Promise<BulkDeleteFlashcardsResult> {
  const existingFlashcards = await Promise.all(
    data.ids.map((id) => getFlashcardByIdForUser(userId, id)),
  );

  if (existingFlashcards.some((item) => !item)) {
    return actionError("flashcards.notFound");
  }

  const ownedFlashcards = existingFlashcards.filter((item) => item !== null);

  await getDb()
    .delete(flashcard)
    .where(and(inArray(flashcard.id, data.ids), eq(flashcard.userId, userId)));

  const removedPathnames = getRemovedAttachmentPathnames(
    ownedFlashcards.flatMap((flashcard) => [flashcard.front, flashcard.back]),
    [],
  );
  await cleanupAttachmentPathnames(userId, removedPathnames);

  return {
    success: true,
    ids: data.ids,
    deckIds: uniqueItems(ownedFlashcards.map((flashcard) => flashcard.deckId)),
  };
}

export async function bulkMoveFlashcardsForUser(
  userId: string,
  data: BulkMoveFlashcardsForm,
): Promise<BulkMoveFlashcardsResult> {
  const existingFlashcards = await getFlashcardRecordsForUser(userId, data.ids);

  if (existingFlashcards.length !== data.ids.length) {
    return actionError("flashcards.notFound");
  }

  const existingDeck = await getDeckRecordForUser(userId, data.deckId);

  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  const movingToNewDeck = existingFlashcards.filter(
    (fc) => fc.deckId !== data.deckId,
  ).length;

  if (movingToNewDeck > 0) {
    const current = await countFlashcardsByDeckForUser(userId, data.deckId);

    if (current + movingToNewDeck > LIMITS.maxFlashcardsPerDeck) {
      return actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerDeck },
      });
    }
  }

  await getDb()
    .update(flashcard)
    .set({ deckId: data.deckId })
    .where(and(inArray(flashcard.id, data.ids), eq(flashcard.userId, userId)));

  return {
    success: true,
    ids: data.ids,
    deckId: data.deckId,
    previousDeckIds: uniqueItems(existingFlashcards.map((fc) => fc.deckId)),
  };
}

export async function bulkResetFlashcardsForUser(
  userId: string,
  data: BulkResetFlashcardsForm,
): Promise<BulkResetFlashcardsResult> {
  const existingFlashcards = await getFlashcardRecordsForUser(userId, data.ids);

  if (existingFlashcards.length !== data.ids.length) {
    return actionError("flashcards.notFound");
  }

  const now = new Date();
  const schedulingState = getInitialFlashcardSchedulingState(now);

  await getDb()
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
    .where(and(inArray(flashcard.id, data.ids), eq(flashcard.userId, userId)));

  return {
    success: true,
    ids: data.ids,
    deckIds: uniqueItems(existingFlashcards.map((fc) => fc.deckId)),
  };
}

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
      ease: schedulingState.ease,
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
