import { createScheduler } from "@/features/flashcards/fsrs/definition";
import {
  buildFsrsCard,
  mapGradeToRating,
  toSchedulingState,
} from "@/features/flashcards/fsrs/mapping";
import type {
  ScheduleFlashcardReviewInput,
  SchedulerOutput,
} from "@/features/flashcards/fsrs/types";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  normalizeFsrsDesiredRetention,
  normalizeFsrsWeights,
} from "@/features/flashcards/fsrs/weights";

export function getInitialFlashcardSchedulingState(now: Date = new Date()) {
  const scheduler = createScheduler({
    desiredRetention: getDefaultFsrsDesiredRetention(),
    weights: getDefaultFsrsWeights(),
    enableFuzz: false,
  });

  return { ...toSchedulingState(scheduler.newCard({ now })), updatedAt: now };
}

export function scheduleFlashcardReview({
  card,
  grade,
  now = new Date(),
  desiredRetention = getDefaultFsrsDesiredRetention(),
  weights = getDefaultFsrsWeights(),
  enableFuzz = true,
}: ScheduleFlashcardReviewInput): SchedulerOutput {
  const scheduler = createScheduler({
    desiredRetention: normalizeFsrsDesiredRetention(desiredRetention),
    weights: normalizeFsrsWeights(weights),
    enableFuzz,
  });
  const next = scheduler.review({
    card: buildFsrsCard(scheduler, card, now),
    grade: mapGradeToRating(grade),
    now,
  });

  return { ...toSchedulingState(next.card), updatedAt: now };
}
