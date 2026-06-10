import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, flashcardMergeLog } from "@/db/schema";
import { cleanupAttachmentsAfterMutation } from "@/features/attachments";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import type { ApplyFlashcardMergeForm } from "@/features/flashcards/validation";
import { isUniqueViolationError } from "@/lib/db/errors";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import type { FlashcardEntity } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type ApplyFlashcardMergeMutationResult =
  | { success: true; flashcard: FlashcardEntity; deletedIds: string[] }
  | ActionErrorResult;

/**
 * Apply an accepted refine proposal: a "relate" proposal creates a new
 * relationship card and keeps the originals; a "merge" proposal replaces
 * the source cards with one synthesis card.
 *
 * Example: await applyRefineProposalForUser(userId, proposalForm);
 */
export async function applyRefineProposalForUser(
  userId: string,
  data: ApplyFlashcardMergeForm,
): Promise<ApplyFlashcardMergeMutationResult> {
  if (data.action === "relate") {
    return createRelatedFlashcardForUser(userId, data);
  }

  return applyFlashcardMergeForUser(userId, data);
}

/**
 * Create the new relationship card in the primary card's deck. Source cards
 * are only verified for ownership — nothing is deleted.
 */
async function createRelatedFlashcardForUser(
  userId: string,
  data: ApplyFlashcardMergeForm,
): Promise<ApplyFlashcardMergeMutationResult> {
  const sourceCards = await getMergeSourceCards(userId, data);
  const primaryCard = sourceCards?.find(
    (card) => card.id === data.primaryFlashcardId,
  );

  if (!primaryCard) {
    return actionError("flashcards.notFound");
  }

  try {
    const inserted = await getDb()
      .insert(flashcard)
      .values({
        deckId: primaryCard.deckId,
        userId,
        front: data.front,
        frontNormalized: normalizeRichTextForUniqueness(data.front),
        back: data.back,
        ...getInitialFlashcardSchedulingState(),
      })
      .returning();

    return { success: true, flashcard: inserted[0], deletedIds: [] };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }

    throw error;
  }
}

/**
 * Collect the primary card plus AI-selected sources, all owned by the user.
 * Returns null when any merged card is missing or foreign.
 */
async function getMergeSourceCards(
  userId: string,
  data: ApplyFlashcardMergeForm,
): Promise<FlashcardEntity[] | null> {
  const mergedIds = Array.from(
    new Set([data.primaryFlashcardId, ...data.sourceFlashcardIds]),
  );

  const rows = await getDb()
    .select()
    .from(flashcard)
    .where(and(inArray(flashcard.id, mergedIds), eq(flashcard.userId, userId)));

  return rows.length === mergedIds.length ? rows : null;
}

/**
 * Create the merged synthesis card and replace its sources in one transaction:
 * insert the new card (fresh FSRS state), snapshot every source into the merge
 * log, then delete the sources (cascade removes their review logs).
 *
 * Example: await applyFlashcardMergeForUser(userId, mergeForm);
 */
export async function applyFlashcardMergeForUser(
  userId: string,
  data: ApplyFlashcardMergeForm,
): Promise<ApplyFlashcardMergeMutationResult> {
  const sourceCards = await getMergeSourceCards(userId, data);

  if (!sourceCards) {
    return actionError("flashcards.notFound");
  }

  const primaryCard = sourceCards.find(
    (card) => card.id === data.primaryFlashcardId,
  );

  if (!primaryCard) {
    return actionError("flashcards.notFound");
  }

  const frontNormalized = normalizeRichTextForUniqueness(data.front);
  const schedulingState = getInitialFlashcardSchedulingState();
  const sourceIds = sourceCards.map((card) => card.id);

  try {
    const mergedCard = await getDb().transaction(async (tx) => {
      // Delete sources first so the merged front can reuse a source's front
      // without tripping the (userId, frontNormalized) unique constraint.
      await tx
        .delete(flashcard)
        .where(
          and(inArray(flashcard.id, sourceIds), eq(flashcard.userId, userId)),
        );

      const inserted = await tx
        .insert(flashcard)
        .values({
          deckId: primaryCard.deckId,
          userId,
          front: data.front,
          frontNormalized,
          back: data.back,
          ...schedulingState,
        })
        .returning();

      const createdCard = inserted[0];

      await tx.insert(flashcardMergeLog).values(
        sourceCards.map((card) => ({
          userId,
          mergedFlashcardId: createdCard.id,
          sourceFlashcardId: card.id,
          sourceFront: card.front,
          sourceBack: card.back,
        })),
      );

      return createdCard;
    });

    await cleanupAttachmentsAfterMutation(
      userId,
      sourceCards.flatMap((card) => [card.front, card.back]),
      [data.front, data.back],
    );

    return { success: true, flashcard: mergedCard, deletedIds: sourceIds };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }

    throw error;
  }
}
