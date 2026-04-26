import { createEmptyCard, fsrs, generatorParameters } from "ts-fsrs";

import {
  defaultDifficultyValue,
  defaultEaseValue,
  defaultSchedulerParameters,
  defaultStabilityValue,
} from "@/features/flashcards/fsrs-constants";
import {
  buildFsrsCard,
  mapGradeToRating,
  mapStateFromFsrs,
} from "@/features/flashcards/fsrs-mapping";
import {
  formatFsrsNumber,
  normalizeDate,
  normalizeFsrsOutputNumber,
  normalizeNonNegativeInteger,
} from "@/features/flashcards/fsrs-normalization";
import type {
  FlashcardReviewPreview,
  PreviewFlashcardReviewInput,
  ReviewGrade,
  ScheduleFlashcardReviewInput,
  SchedulerOutput,
} from "@/features/flashcards/fsrs-types";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  normalizeFsrsDesiredRetention,
  normalizeFsrsWeights,
} from "@/features/flashcards/fsrs-weights";

export function createScheduler({
  desiredRetention,
  weights,
  enableFuzz,
}: {
  desiredRetention: number;
  weights: number[];
  enableFuzz: boolean;
}) {
  return fsrs(
    generatorParameters({
      w: weights,
      request_retention: desiredRetention,
      enable_fuzz: enableFuzz,
      enable_short_term: true,
      learning_steps: defaultSchedulerParameters.learning_steps,
      relearning_steps: defaultSchedulerParameters.relearning_steps,
      maximum_interval: defaultSchedulerParameters.maximum_interval,
    }),
  );
}

export function getInitialFlashcardSchedulingState(now: Date = new Date()) {
  const card = createEmptyCard(now);

  return {
    state: mapStateFromFsrs(card.state),
    dueAt: card.due,
    stability: formatFsrsNumber(card.stability),
    difficulty: formatFsrsNumber(card.difficulty),
    ease: defaultEaseValue,
    intervalDays: card.scheduled_days,
    learningStep: card.learning_steps,
    lastReviewedAt: card.last_review ?? null,
    reviewCount: card.reps,
    lapseCount: card.lapses,
    updatedAt: now,
  };
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
  const currentCard = buildFsrsCard(card, now);
  const next = scheduler.next(currentCard, now, mapGradeToRating(grade));
  const nextCard = next.card;
  const dueAt = normalizeDate(nextCard.due, now);
  const lastReviewedAt = normalizeDate(nextCard.last_review ?? now, now);
  const stability = normalizeFsrsOutputNumber(
    nextCard.stability,
    defaultStabilityValue,
  );
  const difficulty = normalizeFsrsOutputNumber(
    nextCard.difficulty,
    defaultDifficultyValue,
  );
  const intervalDays = normalizeNonNegativeInteger(nextCard.scheduled_days);
  const learningStep = normalizeNonNegativeInteger(nextCard.learning_steps);
  const reviewCount = normalizeNonNegativeInteger(nextCard.reps);
  const lapseCount = normalizeNonNegativeInteger(nextCard.lapses);
  const daysElapsed = normalizeNonNegativeInteger(next.log.elapsed_days);

  return {
    state: mapStateFromFsrs(nextCard.state),
    dueAt,
    stability: formatFsrsNumber(stability),
    difficulty: formatFsrsNumber(difficulty),
    ease: defaultEaseValue,
    intervalDays,
    learningStep,
    lastReviewedAt,
    reviewCount,
    lapseCount,
    updatedAt: now,
    daysElapsed,
  };
}

export function previewFlashcardReview({
  card,
  now = new Date(),
  desiredRetention = getDefaultFsrsDesiredRetention(),
  weights = getDefaultFsrsWeights(),
  enableFuzz = true,
}: PreviewFlashcardReviewInput): Record<ReviewGrade, FlashcardReviewPreview> {
  return {
    again: buildPreviewForGrade("again"),
    hard: buildPreviewForGrade("hard"),
    good: buildPreviewForGrade("good"),
    easy: buildPreviewForGrade("easy"),
  };

  function buildPreviewForGrade(grade: ReviewGrade): FlashcardReviewPreview {
    const nextState = scheduleFlashcardReview({
      card,
      grade,
      now,
      desiredRetention,
      weights,
      enableFuzz,
    });

    return {
      grade,
      nextState: nextState.state,
      nextDueAt: nextState.dueAt,
      intervalDays: nextState.intervalDays,
    };
  }
}
