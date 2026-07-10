import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { cleanupAttachmentsAfterMutation } from "@/features/attachments";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  countFlashcardsBySubjectForUser,
  getFlashcardByIdForUser,
} from "@/features/flashcards/queries";
import type { SplitFlashcardForm } from "@/features/flashcards/validation";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { isUniqueViolationError } from "@/lib/db/errors";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import type {
  FlashcardEntity,
  SplitFlashcardResult,
} from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

function getSplitCapacityIncrease(
  existingSubjectId: string | null,
  targetSubjectId: string,
  createdCount: number,
): number {
  return existingSubjectId === targetSubjectId
    ? Math.max(0, createdCount - 1)
    : createdCount;
}

async function exceedsSplitCapacity(
  userId: string,
  data: SplitFlashcardForm,
  existingSubjectId: string | null,
): Promise<boolean> {
  const current = await countFlashcardsBySubjectForUser(userId, data.subjectId);
  const increase = getSplitCapacityIncrease(
    existingSubjectId,
    data.subjectId,
    data.cards.length,
  );
  return current + increase > LIMITS.maxFlashcardsPerSubject;
}

function buildSplitCardValues(userId: string, data: SplitFlashcardForm) {
  const now = new Date();
  return data.cards.map((card) => ({
    subjectId: data.subjectId,
    userId,
    front: card.front,
    frontNormalized: normalizeRichTextForUniqueness(card.front),
    back: card.back,
    ...getInitialFlashcardSchedulingState(now),
  }));
}

async function validateSplitContext(
  userId: string,
  data: SplitFlashcardForm,
): Promise<{ card: FlashcardEntity } | { error: ActionErrorResult }> {
  const [card, subject] = await Promise.all([
    getFlashcardByIdForUser(userId, data.id),
    getSubjectRecordForUser(userId, data.subjectId),
  ]);
  if (!card || card.type !== "basic") {
    return { error: actionError("flashcards.notFound") };
  }
  if (!subject) {
    return { error: actionError("subjects.notFound") };
  }
  if (await exceedsSplitCapacity(userId, data, card.subjectId)) {
    return {
      error: actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      }),
    };
  }
  return { card };
}

async function replaceWithSplitCards(
  userId: string,
  data: SplitFlashcardForm,
): Promise<ActionErrorResult | null> {
  try {
    await getDb().transaction(async (tx) => {
      await tx
        .delete(flashcard)
        .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)));
      await tx.insert(flashcard).values(buildSplitCardValues(userId, data));
    });
    return null;
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }
    throw error;
  }
}

async function cleanupSplitAttachments(
  userId: string,
  card: FlashcardEntity,
  data: SplitFlashcardForm,
): Promise<void> {
  await cleanupAttachmentsAfterMutation(
    userId,
    [card.front, card.back],
    data.cards.flatMap((splitCard) => [splitCard.front, splitCard.back]),
  );
}

/**
 * Atomically replaces one basic flashcard with all accepted split cards.
 *
 * @example
 * await splitFlashcardForUser(userId, { id, subjectId, cards });
 */
export async function splitFlashcardForUser(
  userId: string,
  data: SplitFlashcardForm,
): Promise<SplitFlashcardResult> {
  const context = await validateSplitContext(userId, data);
  if ("error" in context) {
    return context.error;
  }
  const transactionError = await replaceWithSplitCards(userId, data);
  if (transactionError) {
    return transactionError;
  }
  await cleanupSplitAttachments(userId, context.card, data);
  return {
    success: true,
    createdCount: data.cards.length,
    deletedIds: [data.id],
  };
}
