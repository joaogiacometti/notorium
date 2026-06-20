import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { type flashcard, flashcard as flashcardTable } from "@/db/schema";
import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import {
  deriveOcclusionBack,
  deriveOcclusionFront,
  isValidOcclusionRegion,
  normalizeOcclusionRegion,
  type OcclusionRegion,
  occlusionFrontNormalized,
} from "@/features/flashcards/occlusion";
import {
  countFlashcardsBySubjectForUser,
  getOcclusionSiblingsForUser,
} from "@/features/flashcards/queries";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { isUniqueViolationError } from "@/lib/db/errors";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
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

export interface OcclusionNoteInput {
  subjectId: string;
  occlusionImagePathname: string;
  occlusionRegions: OcclusionRegion[];
}

// Masks arrive from the client in display pixels converted to 0..1; clamp them
// back into the image box and drop any zero-area leftovers before persisting.
function sanitizeRegions(regions: OcclusionRegion[]): OcclusionRegion[] {
  return regions.map(normalizeOcclusionRegion).filter(isValidOcclusionRegion);
}

function buildOcclusionInsert(
  userId: string,
  data: OcclusionNoteInput,
  occlusionNoteId: string,
  regions: OcclusionRegion[],
  index: number,
): FlashcardInsert {
  const region = regions[index];
  const scheduling = getInitialFlashcardSchedulingState();
  return {
    subjectId: data.subjectId,
    userId,
    type: "occlusion",
    occlusionNoteId,
    occlusionMaskId: region.id,
    occlusionImagePathname: data.occlusionImagePathname,
    occlusionRegions: regions,
    front: deriveOcclusionFront(region, index),
    frontNormalized: occlusionFrontNormalized(occlusionNoteId, region.id),
    back: deriveOcclusionBack(region, index),
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

async function assertSubjectCapacity(
  userId: string,
  subjectId: string,
  additionalCards: number,
): Promise<ActionErrorResult | null> {
  if (additionalCards <= 0) {
    return null;
  }
  const currentCount = await countFlashcardsBySubjectForUser(userId, subjectId);
  if (currentCount + additionalCards > LIMITS.maxFlashcardsPerSubject) {
    return actionError("limits.flashcardLimit", {
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
    });
  }
  return null;
}

/**
 * Deletes occlusion source images by pathname. These live outside any rich-text
 * field, so the shared attachment cleanup never sees them; callers must invoke
 * this once no card references them anymore.
 *
 * @example
 * await cleanupOcclusionImagesForUser(userId, [card.occlusionImagePathname]);
 */
export async function cleanupOcclusionImagesForUser(
  userId: string,
  pathnames: Array<string | null>,
): Promise<void> {
  const owned = getOwnedAttachmentPathnames(
    pathnames.filter((pathname): pathname is string => Boolean(pathname)),
    userId,
  );
  if (owned.length === 0) {
    return;
  }
  const provider = await getMediaStorageProvider();
  if (!provider) {
    return;
  }
  await provider.deleteImages({ pathnames: owned });
}

/**
 * Creates an image occlusion note: one scheduled sibling per mask region, all
 * sharing a generated occlusionNoteId, the source image, and the full region
 * list. Returns the first sibling as the representative card.
 *
 * @example
 * await createOcclusionNoteForUser(userId, {
 *   subjectId,
 *   occlusionImagePathname,
 *   occlusionRegions,
 * });
 */
export async function createOcclusionNoteForUser(
  userId: string,
  data: OcclusionNoteInput,
): Promise<CreateFlashcardResult> {
  const existingSubject = await getSubjectRecordForUser(userId, data.subjectId);
  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const regions = sanitizeRegions(data.occlusionRegions);
  if (regions.length === 0) {
    return actionError("flashcards.invalidData");
  }

  const overCapacity = await assertSubjectCapacity(
    userId,
    data.subjectId,
    regions.length,
  );
  if (overCapacity) {
    return overCapacity;
  }

  const occlusionNoteId = crypto.randomUUID();
  const values = regions.map((_region, index) =>
    buildOcclusionInsert(userId, data, occlusionNoteId, regions, index),
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
  data: OcclusionNoteInput,
  occlusionNoteId: string,
  regions: OcclusionRegion[],
  siblings: FlashcardEntity[],
): Promise<void> {
  const byMaskId = new Map(
    siblings.map((card) => [card.occlusionMaskId, card]),
  );
  const db = getDb();

  for (const [index, region] of regions.entries()) {
    const existing = byMaskId.get(region.id);
    const insert = buildOcclusionInsert(
      userId,
      data,
      occlusionNoteId,
      regions,
      index,
    );
    if (existing) {
      // Keep this mask's FSRS state; refresh geometry, shared image and regions.
      await db
        .update(flashcardTable)
        .set({
          subjectId: insert.subjectId,
          occlusionImagePathname: insert.occlusionImagePathname,
          occlusionRegions: insert.occlusionRegions,
          front: insert.front,
          frontNormalized: insert.frontNormalized,
          back: insert.back,
        })
        .where(eq(flashcardTable.id, existing.id));
    } else {
      await db.insert(flashcardTable).values(insert);
    }
  }

  const keptMaskIds = new Set(regions.map((region) => region.id));
  const removedIds = siblings
    .filter((card) => !keptMaskIds.has(card.occlusionMaskId ?? ""))
    .map((card) => card.id);
  if (removedIds.length > 0) {
    await db
      .delete(flashcardTable)
      .where(inArray(flashcardTable.id, removedIds));
  }
}

/**
 * Syncs an occlusion note to new regions/image: kept masks update in place
 * (preserving their FSRS state), new masks insert, removed masks delete, and a
 * replaced source image is cleaned up.
 *
 * @example
 * await editOcclusionNoteForUser(userId, input, existingFlashcard);
 */
export async function editOcclusionNoteForUser(
  userId: string,
  data: OcclusionNoteInput & { id: string },
  existingFlashcard: FlashcardEntity,
): Promise<EditFlashcardResult> {
  const existingSubject = await getSubjectRecordForUser(userId, data.subjectId);
  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const regions = sanitizeRegions(data.occlusionRegions);
  if (regions.length === 0) {
    return actionError("flashcards.invalidData");
  }

  const occlusionNoteId =
    existingFlashcard.occlusionNoteId ?? crypto.randomUUID();
  const siblings = await getOcclusionSiblingsForUser(userId, occlusionNoteId);
  const existingMaskIds = new Set(
    siblings.map((card) => card.occlusionMaskId ?? ""),
  );
  const subjectChanged = existingFlashcard.subjectId !== data.subjectId;
  const additionalCards = subjectChanged
    ? regions.length
    : regions.filter((region) => !existingMaskIds.has(region.id)).length;
  const overCapacity = await assertSubjectCapacity(
    userId,
    data.subjectId,
    additionalCards,
  );
  if (overCapacity) {
    return overCapacity;
  }

  try {
    await syncSiblings(userId, data, occlusionNoteId, regions, siblings);
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("flashcards.duplicateFront");
    }
    throw error;
  }

  const previousImage = existingFlashcard.occlusionImagePathname;
  if (previousImage && previousImage !== data.occlusionImagePathname) {
    await cleanupOcclusionImagesForUser(userId, [previousImage]);
  }

  const updatedSiblings = await getOcclusionSiblingsForUser(
    userId,
    occlusionNoteId,
  );
  const representative =
    updatedSiblings.find((card) => card.id === data.id) ?? updatedSiblings[0];
  if (!representative) {
    return actionError("flashcards.notFound");
  }

  return {
    success: true,
    flashcard: representative,
    previousSubjectId: existingFlashcard.subjectId,
  };
}

/**
 * Deletes every sibling of an occlusion note and its source image. Returns the
 * deleted cards so the caller can react.
 *
 * @example
 * const removed = await deleteOcclusionNoteForUser(userId, "note-123");
 */
export async function deleteOcclusionNoteForUser(
  userId: string,
  occlusionNoteId: string,
): Promise<FlashcardEntity[]> {
  const siblings = await getOcclusionSiblingsForUser(userId, occlusionNoteId);
  if (siblings.length === 0) {
    return [];
  }
  await getDb()
    .delete(flashcardTable)
    .where(
      and(
        eq(flashcardTable.occlusionNoteId, occlusionNoteId),
        eq(flashcardTable.userId, userId),
      ),
    );
  await cleanupOcclusionImagesForUser(userId, [
    siblings[0].occlusionImagePathname,
  ]);
  return siblings;
}
