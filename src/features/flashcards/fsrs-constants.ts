import { generatorParameters } from "ts-fsrs";

export const defaultSchedulerParameters = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
});
export const fsrsWeightCount = defaultSchedulerParameters.w.length;
export const schedulerValidationProbeNow = new Date("2026-01-01T00:00:00.000Z");
export const schedulerValidationMaxNewCardEasyIntervalDays = 90;
export const schedulerValidationCacheMaxEntries = 128;

export const defaultEaseValue = 250;
export const defaultDifficultyValue = 5;
export const defaultStabilityValue = 0;
