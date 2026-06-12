import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { type flashcard, flashcard as flashcardTable } from "@/db/schema";
import { cleanupAttachmentsAfterMutation } from "@/features/attachments";
import { getDeckRecordForUser } from "@/features/decks/queries";
import {
  parseClozeOrdinals,
  renderClozeBack,
  renderClozeFront,
} from "@/features/flashcards/cloze";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  countFlashcardsByDeckForUser,
  getClozeSiblingsForUser,
} from "@/features/flashcards/queries";
import { LIMITS } from "@/lib/config/limits";
import { isUniqueViolationError } from "@/lib/db/errors";
import {
  hasRichTextContent,
  normalizeRichTextForUniqueness,
} from "@/lib/editor/rich-text";
import type {
  CreateFlashcardResult,
  EditFlashcardResult,
  FlashcardEntity,
} from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type FlashcardInsert = typeof flashcard.$inferInsert;

export interface ClozeNoteInput {
  deckId: string;
  clozeSource: string;
  back: string;
}

interface SiblingContent {
  front: string;
  frontNormalized: string;
  back: string;
}

// The back shows the fully revealed text with the tested deletion highlighted,
// followed by the optional extra/context.
function buildSiblingContent(
  clozeSource: string,
  ordinal: number,
  extra: string,
): SiblingContent {
  const front = renderClozeFront(clozeSource, ordinal);
  const revealed = renderClozeBack(clozeSource, ordinal);
  const back = hasRichTextContent(extra) ? `${revealed}${extra}` : revealed;
  return {
    front,
    frontNormalized: normalizeRichTextForUniqueness(front),
    back,
  };
}

function buildSiblingInsert(
  userId: string,
  data: ClozeNoteInput,
  clozeNoteId: string,
  ordinal: number,
): FlashcardInsert {
  const scheduling = getInitialFlashcardSchedulingState();
  const { front, frontNormalized, back } = buildSiblingContent(
    data.clozeSource,
    ordinal,
    data.back,
  );
  return {
    deckId: data.deckId,
    userId,
    type: "cloze",
    clozeNoteId,
    clozeOrdinal: ordinal,
    clozeSource: data.clozeSource,
    front,
    frontNormalized,
    back,
    state: scheduling.state,
    dueAt: scheduling.dueAt,
    stability: scheduling.stability,
    difficulty: scheduling.difficulty,
    ease: scheduling.ease,
    intervalDays: scheduling.intervalDays,
    learningStep: scheduling.learningStep,
    lastReviewedAt: scheduling.lastReviewedAt,
    reviewCount: scheduling.reviewCount,
    lapseCount: scheduling.lapseCount,
  };
}

async function assertDeckCapacity(
  userId: string,
  deckId: string,
  additionalCards: number,
): Promise<ActionErrorResult | null> {
  if (additionalCards <= 0) {
    return null;
  }
  const currentCount = await countFlashcardsByDeckForUser(userId, deckId);
  if (currentCount + additionalCards > LIMITS.maxFlashcardsPerDeck) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerDeck },
    });
  }
  return null;
}

/**
 * Creates a cloze note: one scheduled sibling card per distinct deletion
 * ordinal, all sharing a generated clozeNoteId. Returns the first sibling as the
 * representative card.
 *
 * @example
 * await createClozeNoteForUser(userId, { deckId, clozeSource, back: "" });
 */
export async function createClozeNoteForUser(
  userId: string,
  data: ClozeNoteInput,
): Promise<CreateFlashcardResult> {
  const existingDeck = await getDeckRecordForUser(userId, data.deckId);
  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  const ordinals = parseClozeOrdinals(data.clozeSource);
  const overCapacity = await assertDeckCapacity(
    userId,
    data.deckId,
    ordinals.length,
  );
  if (overCapacity) {
    return overCapacity;
  }

  const clozeNoteId = crypto.randomUUID();
  const values = ordinals.map((ordinal) =>
    buildSiblingInsert(userId, data, clozeNoteId, ordinal),
  );

  try {
    const inserted = await getDb()
      .insert(flashcardTable)
      .values(values)
      .returning();
    return { success: true, flashcard: inserted[0] };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }
    throw error;
  }
}

async function syncSiblings(
  userId: string,
  data: ClozeNoteInput,
  clozeNoteId: string,
  siblings: FlashcardEntity[],
): Promise<void> {
  const ordinals = parseClozeOrdinals(data.clozeSource);
  const byOrdinal = new Map(siblings.map((card) => [card.clozeOrdinal, card]));
  const db = getDb();

  for (const ordinal of ordinals) {
    const content = buildSiblingContent(data.clozeSource, ordinal, data.back);
    const existing = byOrdinal.get(ordinal);
    if (existing) {
      await db
        .update(flashcardTable)
        .set({ deckId: data.deckId, clozeSource: data.clozeSource, ...content })
        .where(eq(flashcardTable.id, existing.id));
    } else {
      await db
        .insert(flashcardTable)
        .values(buildSiblingInsert(userId, data, clozeNoteId, ordinal));
    }
  }

  const removedIds = siblings
    .filter((card) => !ordinals.includes(card.clozeOrdinal ?? -1))
    .map((card) => card.id);
  if (removedIds.length > 0) {
    await db
      .delete(flashcardTable)
      .where(inArray(flashcardTable.id, removedIds));
  }
}

/**
 * Syncs a cloze note to a new source: updates kept ordinals in place (preserving
 * their FSRS state), inserts new ordinals, and deletes removed ones.
 *
 * @example
 * await editClozeNoteForUser(userId, { deckId, clozeSource, back }, existing);
 */
export async function editClozeNoteForUser(
  userId: string,
  data: ClozeNoteInput & { id: string },
  existingFlashcard: FlashcardEntity,
): Promise<EditFlashcardResult> {
  const existingDeck = await getDeckRecordForUser(userId, data.deckId);
  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  const clozeNoteId = existingFlashcard.clozeNoteId ?? crypto.randomUUID();
  const siblings = await getClozeSiblingsForUser(userId, clozeNoteId);
  const newOrdinals = parseClozeOrdinals(data.clozeSource);
  // Moving decks shifts every surviving sibling into the target deck; staying
  // put only adds the brand-new ordinals there.
  const deckChanged = existingFlashcard.deckId !== data.deckId;
  const additionalCards = deckChanged
    ? newOrdinals.length
    : newOrdinals.filter(
        (ordinal) => !siblings.some((card) => card.clozeOrdinal === ordinal),
      ).length;
  const overCapacity = await assertDeckCapacity(
    userId,
    data.deckId,
    additionalCards,
  );
  if (overCapacity) {
    return overCapacity;
  }

  const previousValues = siblings.flatMap((card) => [card.front, card.back]);

  try {
    await syncSiblings(userId, data, clozeNoteId, siblings);
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }
    throw error;
  }

  const updatedSiblings = await getClozeSiblingsForUser(userId, clozeNoteId);
  const representative =
    updatedSiblings.find((card) => card.id === data.id) ?? updatedSiblings[0];
  if (!representative) {
    return actionError("flashcards.notFound");
  }

  await cleanupAttachmentsAfterMutation(
    userId,
    previousValues,
    updatedSiblings.flatMap((card) => [card.front, card.back]),
  );

  return {
    success: true,
    flashcard: representative,
    previousDeckId: existingFlashcard.deckId,
  };
}

/**
 * Deletes every sibling of a cloze note in one statement. Returns the deleted
 * cards so the caller can clean up attachments.
 *
 * @example
 * const removed = await deleteClozeNoteForUser(userId, "note-123");
 */
export async function deleteClozeNoteForUser(
  userId: string,
  clozeNoteId: string,
): Promise<FlashcardEntity[]> {
  const siblings = await getClozeSiblingsForUser(userId, clozeNoteId);
  if (siblings.length === 0) {
    return [];
  }
  await getDb()
    .delete(flashcardTable)
    .where(
      and(
        eq(flashcardTable.clozeNoteId, clozeNoteId),
        eq(flashcardTable.userId, userId),
      ),
    );
  return siblings;
}
