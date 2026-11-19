import { FSRS7_DEFAULT_WEIGHTS } from "ts-fsrs/models/fsrs-7";

export const defaultFsrsWeights: readonly number[] = FSRS7_DEFAULT_WEIGHTS;
export const fsrsWeightCount = defaultFsrsWeights.length;
export const defaultFsrsDesiredRetention = 0.9;
export const fsrsLearningSteps = ["1m", "10m"] as const;
export const fsrsRelearningSteps = ["10m"] as const;
export const fsrsMaximumIntervalDays = 36500;

export const schedulerValidationProbeNow = new Date("2026-01-01T00:00:00.000Z");
export const schedulerValidationMaxNewCardEasyIntervalDays = 90;
export const schedulerValidationCacheMaxEntries = 128;
