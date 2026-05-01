import { applyReviewedFlashcardToState } from "@/features/flashcard-review/state";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import { scheduleFlashcardReview } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

function buildScheduledFlashcard(
  card: FlashcardReviewEntity,
  grade: ReviewGrade,
  state: FlashcardReviewState,
  reviewedAt: Date,
): FlashcardReviewEntity {
  const next = scheduleFlashcardReview({
    card,
    grade,
    now: reviewedAt,
    desiredRetention: state.scheduler.desiredRetention,
    weights: state.scheduler.weights,
  });

  return {
    ...card,
    state: next.state,
    dueAt: next.dueAt,
    stability: next.stability,
    difficulty: next.difficulty,
    ease: next.ease,
    intervalDays: next.intervalDays,
    learningStep: next.learningStep,
    lastReviewedAt: next.lastReviewedAt,
    reviewCount: next.reviewCount,
    lapseCount: next.lapseCount,
  };
}

/**
 * Applies one review locally so an already-loaded offline session can continue.
 *
 * @example
 * applyOfflineFlashcardReview({ state, card, grade: "good", reviewedAt })
 */
export function applyOfflineFlashcardReview({
  state,
  card,
  grade,
  reviewedAt,
}: {
  state: FlashcardReviewState;
  card: FlashcardReviewEntity;
  grade: ReviewGrade;
  reviewedAt: Date;
}): FlashcardReviewState {
  return applyReviewedFlashcardToState(
    state,
    card.id,
    buildScheduledFlashcard(card, grade, state, reviewedAt),
    reviewedAt,
  );
}
