import { Reschedule } from "ts-fsrs/reschedule";
import type { FsrsScheduler } from "@/features/flashcards/fsrs/definition";
import { mapGradeToRating } from "@/features/flashcards/fsrs/mapping";
import { formatFsrsNumber } from "@/features/flashcards/fsrs/normalization";
import type { ReviewGrade } from "@/features/flashcards/fsrs/types";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

type RebuildCard = Pick<
  FlashcardEntity,
  "id" | "reviewCount" | "lastReviewedAt"
>;

interface RebuildReview {
  rating: ReviewGrade;
  reviewedAt: Date;
}

export type FlashcardMemoryRebuild =
  | {
      ok: true;
      memory: { stability: string; stabilityFast: string; difficulty: string };
    }
  | { ok: false; reason: "missingHistory" | "historyMismatch" };

/**
 * Rebuild a learned card's FSRS-7 memory by replaying its current history.
 * Resets write no log but zero `reviewCount`, so the current history is the
 * card's latest `reviewCount` reviews; it must end at `lastReviewedAt`.
 * Due dates, counters, and learning progress are left to the caller.
 *
 * @example
 * const rebuilt = rebuildFlashcardMemory(scheduler, card, cardReviewsInOrder);
 */
export function rebuildFlashcardMemory(
  scheduler: FsrsScheduler,
  card: RebuildCard,
  reviewsInOrder: readonly RebuildReview[],
): FlashcardMemoryRebuild {
  if (card.reviewCount < 1 || reviewsInOrder.length < card.reviewCount) {
    return { ok: false, reason: "missingHistory" };
  }

  const history = reviewsInOrder.slice(-card.reviewCount);
  const latest = history.at(-1);
  if (
    !latest ||
    !card.lastReviewedAt ||
    latest.reviewedAt.getTime() !== card.lastReviewedAt.getTime()
  ) {
    return { ok: false, reason: "historyMismatch" };
  }

  const { memoryState } = new Reschedule(scheduler).replay({
    history: history.map((review) => ({
      rating: mapGradeToRating(review.rating),
      reviewTime: review.reviewedAt,
    })),
  });

  return {
    ok: true,
    memory: {
      stability: formatFsrsNumber(memoryState.stability),
      stabilityFast: formatFsrsNumber(memoryState.stabilityFast),
      difficulty: formatFsrsNumber(memoryState.difficulty),
    },
  };
}
