import { dateChrono, defineScheduler } from "ts-fsrs";
import {
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from "ts-fsrs/middlewares";
import { FSRS7Model } from "ts-fsrs/models/fsrs-7";
import {
  fsrsLearningSteps,
  fsrsMaximumIntervalDays,
  fsrsRelearningSteps,
} from "@/features/flashcards/fsrs/constants";

// Middleware order follows the ts-fsrs standard preset; a bare definition
// would skip retention, fuzzing, statistics, steps, and interval limits.
export const fsrsSchedulerDefinition = defineScheduler({
  model: FSRS7Model,
  chrono: dateChrono,
}).use(
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
);

export function createScheduler({
  desiredRetention,
  weights,
  enableFuzz,
}: {
  desiredRetention: number;
  weights: readonly number[];
  enableFuzz: boolean;
}) {
  return fsrsSchedulerDefinition.create({
    config: {
      weights,
      desiredRetention,
      enableFuzz,
      fractionalDays: true,
      enableShortTerm: true,
      learningSteps: [...fsrsLearningSteps],
      relearningSteps: [...fsrsRelearningSteps],
      allowModelOverride: true,
      maximumInterval: fsrsMaximumIntervalDays,
      clearStatsOnForget: false,
    },
  });
}

export type FsrsScheduler = ReturnType<typeof createScheduler>;
export type FsrsCard = ReturnType<FsrsScheduler["newCard"]>;
