import type {
  FlashcardExamScopeInput,
  FlashcardReviewStateQueryInput,
} from "@/features/flashcard-review/validation";
import type { RefineGroups } from "@/features/flashcards/refine/types";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import {
  fetchReadApi,
  fetchReadApiResult,
} from "@/lib/read-api/read-api-client";
import type {
  FlashcardEntity,
  FlashcardManagePage,
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

type FlashcardIdsResult =
  | { success: true; flashcardIds: string[] }
  | ActionErrorResult;

type RefineFlashcardGroupsResult =
  | { success: true; groups: RefineGroups }
  | ActionErrorResult;

/**
 * Load one page of the flashcard manage table.
 *
 * @example
 * const page = await fetchFlashcardsManagePage({ pageIndex: 0, pageSize: 25 });
 */
export function fetchFlashcardsManagePage(
  query: FlashcardsManageQueryInput,
): Promise<FlashcardManagePage | ActionErrorResult> {
  return fetchReadApiResult<FlashcardManagePage>(
    "/api/flashcards/manage-page",
    query,
  );
}

/**
 * Load one flashcard for the manage edit dialog.
 *
 * @example
 * const result = await fetchFlashcardForManage(flashcardId);
 * if (!("errorCode" in result)) openEditor(result.flashcard);
 */
export async function fetchFlashcardForManage(
  flashcardId: string,
): Promise<{ flashcard: FlashcardEntity } | ActionErrorResult> {
  const result = await fetchReadApiResult<FlashcardEntity>(
    `/api/flashcards/${encodeURIComponent(flashcardId)}`,
  );
  return "errorCode" in result ? result : { flashcard: result };
}

/**
 * Load every flashcard id, or one subject's when `subjectId` is given.
 *
 * @example
 * const result = await fetchFlashcardIds(subjectId);
 */
export async function fetchFlashcardIds(
  subjectId?: string,
): Promise<FlashcardIdsResult> {
  const result = await fetchReadApiResult<string[]>("/api/flashcards/ids", {
    subjectId,
  });
  return Array.isArray(result)
    ? { success: true, flashcardIds: result }
    : result;
}

/**
 * Load the mastered and struggling groups for the manage refine mode.
 *
 * @example
 * const result = await fetchRefineFlashcardGroups();
 */
export async function fetchRefineFlashcardGroups(): Promise<RefineFlashcardGroupsResult> {
  const result = await fetchReadApiResult<RefineGroups>(
    "/api/flashcards/refine-groups",
  );
  return "errorCode" in result ? result : { success: true, groups: result };
}

/**
 * Load the due cards, counts, and scheduler settings for a review session.
 *
 * @example
 * const state = await fetchFlashcardReviewState({ subjectId, limit: 50 });
 */
export function fetchFlashcardReviewState(
  query: FlashcardReviewStateQueryInput = {},
): Promise<FlashcardReviewState> {
  return fetchReadApi<FlashcardReviewState>(
    "/api/flashcards/review-state",
    query,
  );
}

/**
 * Load every card in scope for exam mode.
 *
 * @example
 * const cards = await fetchExamFlashcards({ subjectId });
 */
export function fetchExamFlashcards(
  query: FlashcardExamScopeInput = {},
): Promise<FlashcardReviewEntity[]> {
  return fetchReadApi<FlashcardReviewEntity[]>(
    "/api/flashcards/exam-cards",
    query,
  );
}
