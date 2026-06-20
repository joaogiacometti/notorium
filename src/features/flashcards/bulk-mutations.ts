import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { cleanupAttachmentsAfterMutation } from "@/features/attachments";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";
import { cleanupOcclusionImagesForUser } from "@/features/flashcards/occlusion-mutations";
import {
  countFlashcardsBySubjectForUser,
  expandOcclusionSiblingIds,
  getFlashcardByIdForUser,
  getFlashcardRecordsForUser,
} from "@/features/flashcards/queries";
import type {
  BulkDeleteFlashcardsForm,
  BulkMoveFlashcardsForm,
  BulkResetFlashcardsForm,
} from "@/features/flashcards/validation";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import type {
  BulkDeleteFlashcardsResult,
  BulkMoveFlashcardsResult,
  BulkResetFlashcardsResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";
import { uniqueItems } from "@/lib/utils";

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

  // Deleting an occlusion card removes its whole note, so pull in every sibling.
  const expandedIds = await expandOcclusionSiblingIds(userId, data.ids);
  const expandedFlashcards =
    expandedIds.length === data.ids.length
      ? existingFlashcards
      : await Promise.all(
          expandedIds.map((id) => getFlashcardByIdForUser(userId, id)),
        );
  const ownedFlashcards = expandedFlashcards.filter((item) => item !== null);

  await getDb()
    .delete(flashcard)
    .where(
      and(inArray(flashcard.id, expandedIds), eq(flashcard.userId, userId)),
    );

  await cleanupAttachmentsAfterMutation(
    userId,
    ownedFlashcards.flatMap((flashcard) => [flashcard.front, flashcard.back]),
    [],
  );
  await cleanupOcclusionImagesForUser(
    userId,
    ownedFlashcards.map((flashcard) => flashcard.occlusionImagePathname),
  );

  return {
    success: true,
    ids: data.ids,
    subjectIds: uniqueItems(
      ownedFlashcards
        .map((flashcard) => flashcard.subjectId)
        .filter((id): id is string => id !== null),
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

  const existingSubject = await getSubjectRecordForUser(userId, data.subjectId);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  // Moving an occlusion card moves its whole note so siblings stay together.
  const expandedIds = await expandOcclusionSiblingIds(userId, data.ids);
  const expandedFlashcards =
    expandedIds.length === data.ids.length
      ? existingFlashcards
      : await getFlashcardRecordsForUser(userId, expandedIds);

  const movingToNewSubject = expandedFlashcards.filter(
    (fc) => fc.subjectId !== data.subjectId,
  ).length;

  if (movingToNewSubject > 0) {
    const current = await countFlashcardsBySubjectForUser(
      userId,
      data.subjectId,
    );

    if (current + movingToNewSubject > LIMITS.maxFlashcardsPerSubject) {
      return actionError("limits.flashcardLimit", {
        errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      });
    }
  }

  await getDb()
    .update(flashcard)
    .set({ subjectId: data.subjectId })
    .where(
      and(inArray(flashcard.id, expandedIds), eq(flashcard.userId, userId)),
    );

  return {
    success: true,
    ids: data.ids,
    subjectId: data.subjectId,
    previousSubjectIds: uniqueItems(
      expandedFlashcards
        .map((fc) => fc.subjectId)
        .filter((id): id is string => id !== null),
    ),
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

  // Resetting an occlusion card resets its whole note's masks together.
  const expandedIds = await expandOcclusionSiblingIds(userId, data.ids);
  const expandedFlashcards =
    expandedIds.length === data.ids.length
      ? existingFlashcards
      : await getFlashcardRecordsForUser(userId, expandedIds);

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
    .where(
      and(inArray(flashcard.id, expandedIds), eq(flashcard.userId, userId)),
    );

  return {
    success: true,
    ids: data.ids,
    subjectIds: uniqueItems(
      expandedFlashcards
        .map((fc) => fc.subjectId)
        .filter((id): id is string => id !== null),
    ),
  };
}
