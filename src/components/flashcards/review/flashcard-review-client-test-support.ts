import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

const scheduler = {
  desiredRetention: 0.9,
  weights: getDefaultFsrsWeights(),
};

export function makeCard(id: string): FlashcardReviewEntity {
  return {
    id,
    front: `<p>${id} front</p>`,
    back: `<p>${id} back</p>`,
    state: "new",
    dueAt: new Date("2026-03-07T11:00:00.000Z"),
    stability: null,
    difficulty: null,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    subjectId: "deck-1",
    subjectName: "Biology",
    subjectPath: "Biology",
  };
}

export function makeReviewState(
  dueCount: number,
  cards: FlashcardReviewEntity[] = [],
): FlashcardReviewState {
  return {
    cards,
    summary: {
      dueCount,
      totalCount: Math.max(dueCount, cards.length),
    },
    scheduler,
  };
}

export function createDeferred<T>() {
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}
