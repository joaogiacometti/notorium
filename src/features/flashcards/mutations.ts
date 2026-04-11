import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import {
  getDeckRecordForUser,
  getDefaultDeckForSubject,
} from "@/features/decks/queries";
import {
  generateFlashcardBackForUser,
  improveFlashcardBackForUser,
} from "@/features/flashcards/ai-service";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  countFlashcardsBySubjectForUser,
  getFlashcardRecordForUser,
  getFlashcardRecordsForUser,
  hasDuplicateFlashcardFrontForUser,
} from "@/features/flashcards/queries";
import type {
  BulkDeleteFlashcardsForm,
  BulkMoveFlashcardsForm,
  CreateFlashcardForm,
  DeleteFlashcardForm,
  EditFlashcardForm,
  GenerateFlashcardBackForm,
  ResetFlashcardForm,
} from "@/features/flashcards/validation";
import {
  getActiveSubjectByIdForUser,
  getActiveSubjectRecordForUser,
} from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import type {
  BulkDeleteFlashcardsResult,
  BulkMoveFlashcardsResult,
  CreateFlashcardResult,
  EditFlashcardResult,
  GenerateFlashcardBackResult,
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
      subjectId: string;
    }
  | ActionErrorResult;

function getUniqueSubjectIds(subjectIds: string[]): string[] {
  return [...new Set(subjectIds)];
}

function isUniqueViolationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (
    "code" in error &&
    (
      error as {
        code?: string;
      }
    ).code === "23505"
  );
}

function normalizeOptionalDeckId(
  deckId: string | null | undefined,
): string | undefined {
  if (!deckId) {
    return undefined;
  }

  const trimmedDeckId = deckId.trim();

  return trimmedDeckId.length > 0 ? trimmedDeckId : undefined;
}

async function getCreateFlashcardPreflight(
  userId: string,
  subjectId: string,
  deckId: string | undefined,
  frontNormalized: string,
) {
  const [existingSubject, currentCount, hasDuplicate, existingDeck] =
    await Promise.all([
      getActiveSubjectRecordForUser(userId, subjectId),
      countFlashcardsBySubjectForUser(userId, subjectId),
      hasDuplicateFlashcardFrontForUser(userId, frontNormalized),
      deckId ? getDeckRecordForUser(userId, deckId) : null,
    ]);

  return {
    existingSubject,
    currentCount,
    hasDuplicate,
    existingDeck,
  };
}

async function getEditFlashcardPreflight(
  userId: string,
  data: Pick<EditFlashcardForm, "id" | "subjectId" | "deckId" | "front">,
  frontNormalized: string,
) {
  const [existingFlashcard, existingSubject, hasDuplicate, existingDeck] =
    await Promise.all([
      getFlashcardRecordForUser(userId, data.id),
      getActiveSubjectRecordForUser(userId, data.subjectId),
      hasDuplicateFlashcardFrontForUser(userId, frontNormalized, data.id),
      data.deckId ? getDeckRecordForUser(userId, data.deckId) : null,
    ]);

  return {
    existingFlashcard,
    existingSubject,
    hasDuplicate,
    existingDeck,
  };
}

export async function createFlashcardForUser(
  userId: string,
  data: CreateFlashcardForm,
): Promise<CreateFlashcardResult> {
  const frontNormalized = normalizeRichTextForUniqueness(data.front);
  const inputDeckId = normalizeOptionalDeckId(data.deckId);
  const { existingSubject, currentCount, hasDuplicate, existingDeck } =
    await getCreateFlashcardPreflight(
      userId,
      data.subjectId,
      inputDeckId,
      frontNormalized,
    );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (currentCount >= LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }

  if (hasDuplicate) {
    return actionError("flashcards.duplicateFront");
  }

  if (inputDeckId && !existingDeck) {
    return actionError("decks.notFound");
  }

  if (existingDeck && existingDeck.subjectId !== data.subjectId) {
    return actionError("decks.wrongSubject");
  }

  const defaultDeck = await getDefaultDeckForSubject(userId, data.subjectId);
  const deckId = inputDeckId ?? defaultDeck.id;

  const schedulingState = getInitialFlashcardSchedulingState();
  try {
    const inserted = await getDb()
      .insert(flashcard)
      .values({
        subjectId: data.subjectId,
        deckId,
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
  const inputDeckId = normalizeOptionalDeckId(data.deckId);
  const { existingFlashcard, existingSubject, hasDuplicate, existingDeck } =
    await getEditFlashcardPreflight(
      userId,
      { ...data, deckId: inputDeckId },
      frontNormalized,
    );

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (existingFlashcard.subjectId !== data.subjectId) {
    const current = await countFlashcardsBySubjectForUser(
      userId,
      data.subjectId,
    );

    if (current >= LIMITS.maxFlashcardsPerSubject) {
      return actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      });
    }
  }

  if (hasDuplicate) {
    return actionError("flashcards.duplicateFront");
  }

  if (inputDeckId && !existingDeck) {
    return actionError("decks.notFound");
  }

  if (existingDeck && existingDeck.subjectId !== data.subjectId) {
    return actionError("decks.wrongSubject");
  }

  const targetDeckId = inputDeckId
    ? inputDeckId
    : (await getDefaultDeckForSubject(userId, data.subjectId)).id;

  try {
    const updated = await getDb()
      .update(flashcard)
      .set({
        subjectId: data.subjectId,
        deckId: targetDeckId,
        front: data.front,
        frontNormalized,
        back: data.back,
      })
      .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)))
      .returning();

    return {
      success: true,
      flashcard: updated[0],
      previousSubjectId: existingFlashcard.subjectId,
    };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }

    throw error;
  }
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
  const [existingSubject, existingDeck] = await Promise.all([
    getActiveSubjectByIdForUser(userId, data.subjectId),
    data.deckId ? getDeckRecordForUser(userId, data.deckId) : null,
  ]);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (data.deckId && !existingDeck) {
    return actionError("decks.notFound");
  }

  if (existingDeck && existingDeck.subjectId !== data.subjectId) {
    return actionError("decks.wrongSubject");
  }

  if (data.currentBack) {
    const result = await improveFlashcardBackForUser({
      userId,
      subjectName: existingSubject.name,
      deckName: existingDeck?.isDefault ? null : (existingDeck?.name ?? null),
      front: data.front,
      currentBack: data.currentBack,
    });

    return mapAiServiceResult(result);
  }

  const result = await generateFlashcardBackForUser({
    userId,
    subjectName: existingSubject.name,
    deckName: existingDeck?.isDefault ? null : (existingDeck?.name ?? null),
    front: data.front,
  });

  return mapAiServiceResult(result);
}

export async function deleteFlashcardForUser(
  userId: string,
  data: DeleteFlashcardForm,
): Promise<DeleteFlashcardMutationResult> {
  const existingFlashcard = await getFlashcardRecordForUser(userId, data.id);

  if (!existingFlashcard) {
    return actionError("flashcards.notFound");
  }

  await getDb()
    .delete(flashcard)
    .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)));

  return { success: true, id: data.id, subjectId: existingFlashcard.subjectId };
}

export async function bulkDeleteFlashcardsForUser(
  userId: string,
  data: BulkDeleteFlashcardsForm,
): Promise<BulkDeleteFlashcardsResult> {
  const existingFlashcards = await getFlashcardRecordsForUser(userId, data.ids);

  if (existingFlashcards.length !== data.ids.length) {
    return actionError("flashcards.notFound");
  }

  await getDb()
    .delete(flashcard)
    .where(and(inArray(flashcard.id, data.ids), eq(flashcard.userId, userId)));

  return {
    success: true,
    ids: data.ids,
    subjectIds: getUniqueSubjectIds(
      existingFlashcards.map((flashcard) => flashcard.subjectId),
    ),
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

  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const inputDeckId = normalizeOptionalDeckId(data.deckId);
  let targetDeckId: string;

  if (inputDeckId) {
    const existingDeck = await getDeckRecordForUser(userId, inputDeckId);
    if (!existingDeck) {
      return actionError("decks.notFound");
    }
    if (existingDeck.subjectId !== data.subjectId) {
      return actionError("decks.notFound");
    }
    targetDeckId = inputDeckId;
  } else {
    const defaultDeck = await getDefaultDeckForSubject(userId, data.subjectId);
    targetDeckId = defaultDeck.id;
  }

  const nextCount = existingFlashcards.filter(
    (flashcard) => flashcard.subjectId !== data.subjectId,
  ).length;

  if (nextCount > 0) {
    const current = await countFlashcardsBySubjectForUser(
      userId,
      data.subjectId,
    );

    if (current + nextCount > LIMITS.maxFlashcardsPerSubject) {
      return actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      });
    }
  }

  await getDb()
    .update(flashcard)
    .set({
      subjectId: data.subjectId,
      deckId: targetDeckId,
    })
    .where(and(inArray(flashcard.id, data.ids), eq(flashcard.userId, userId)));

  return {
    success: true,
    ids: data.ids,
    subjectId: data.subjectId,
    previousSubjectIds: getUniqueSubjectIds(
      existingFlashcards.map((flashcard) => flashcard.subjectId),
    ),
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
