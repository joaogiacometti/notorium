import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { testDocument } from "@/test/document";

/** Default scheduler values for review-state tests. */
export const testReviewScheduler = {
  desiredRetention: 0.9,
  weights: getDefaultFsrsWeights(),
};

/** A due-queue card, new by default; override any scheduling field. */
export function makeReviewCard(
  id: string,
  dueAt: Date,
  overrides: Partial<FlashcardReviewEntity> = {},
): FlashcardReviewEntity {
  return {
    id,
    front: testDocument(`<p>${id} front</p>`),
    back: testDocument(`<p>${id} back</p>`),
    state: "new",
    dueAt,
    stability: null,
    stabilityFast: null,
    difficulty: null,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    studyLaterAt: null,
    folderId: "deck-1",
    ...overrides,
  };
}

/** A review state whose due and total counts both equal `dueCount`. */
export function makeReviewState(
  cards: FlashcardReviewEntity[],
  dueCount: number,
): FlashcardReviewState {
  return {
    cards,
    summary: { dueCount, totalCount: dueCount },
    scheduler: testReviewScheduler,
  };
}
