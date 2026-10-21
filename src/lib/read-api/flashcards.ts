import type {
  FlashcardExamScopeInput,
  FlashcardReviewStateQueryInput,
} from "@/features/flashcard-review/validation";
import type { StrugglingFlashcard } from "@/features/flashcards/refine/types";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import { LIMITS } from "@/lib/config/limits";
import {
  fetchReadApi,
  fetchReadApiResult,
} from "@/lib/read-api/read-api-client";
import type {
  FlashcardContentItem,
  FlashcardEntity,
  FlashcardManagePage,
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

type StrugglingFlashcardsResult =
  | { success: true; cards: StrugglingFlashcard[] }
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
 * Load the full content of the given flashcards for copying, in the order of
 * `flashcardIds`. Ids go out in chunks so a 500-card selection stays within URL
 * length limits; cards deleted in the meantime are skipped. Any failed chunk
 * rejects the whole load.
 *
 * @example
 * const cards = await fetchFlashcardContents(selectedFlashcardIds);
 */
export async function fetchFlashcardContents(
  flashcardIds: readonly string[],
): Promise<FlashcardContentItem[]> {
  const chunks = chunkFlashcardIds(flashcardIds);
  const chunkResults = await Promise.all(
    chunks.map((ids) =>
      fetchReadApi<FlashcardContentItem[]>("/api/flashcards/contents", { ids }),
    ),
  );
  const contentsById = new Map(
    chunkResults.flat().map((item) => [item.id, item]),
  );
  return flashcardIds.flatMap((id) => contentsById.get(id) ?? []);
}

/**
 * Load the struggling cards for the manage refine mode.
 *
 * @example
 * const result = await fetchStrugglingFlashcards();
 */
export async function fetchStrugglingFlashcards(): Promise<StrugglingFlashcardsResult> {
  const result = await fetchReadApiResult<StrugglingFlashcard[]>(
    "/api/flashcards/struggling",
  );
  return "errorCode" in result ? result : { success: true, cards: result };
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

function chunkFlashcardIds(flashcardIds: readonly string[]): string[][] {
  const chunkSize = LIMITS.flashcardContentsReadMax;
  const chunks: string[][] = [];
  for (let start = 0; start < flashcardIds.length; start += chunkSize) {
    chunks.push(flashcardIds.slice(start, start + chunkSize));
  }
  return chunks;
}
