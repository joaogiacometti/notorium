import { Rating } from "ts-fsrs";
import { z } from "zod";

import {
  schedulerValidationCacheMaxEntries,
  schedulerValidationMaxNewCardEasyIntervalDays,
  schedulerValidationProbeNow,
} from "@/features/flashcards/fsrs/constants";
import { createScheduler } from "@/features/flashcards/fsrs/definition";
import { mapStateFromFsrs } from "@/features/flashcards/fsrs/mapping";
import type { FsrsSchedulerValidationInput } from "@/features/flashcards/fsrs/types";
import {
  areFsrsWeightsWellFormed,
  isFsrsDesiredRetentionValid,
} from "@/features/flashcards/fsrs/weights";
import { LIMITS } from "@/lib/config/limits";

export const updateFsrsOptimizationPreferencesSchema = z.object({
  automaticOptimizationEnabled: z.boolean(),
});

export type UpdateFsrsOptimizationPreferencesForm = z.infer<
  typeof updateFsrsOptimizationPreferencesSchema
>;

export const updateNewCardsPerDaySchema = z.object({
  newCardsPerDay: z.number().int().min(0).max(LIMITS.newCardsPerDayMax),
});

export type UpdateNewCardsPerDayForm = z.infer<
  typeof updateNewCardsPerDaySchema
>;

const schedulerSettingsValidationCache = new Map<string, boolean>();

export function buildSchedulerValidationCacheKey({
  desiredRetention,
  weights,
  maxNewCardEasyIntervalDays,
}: FsrsSchedulerValidationInput): string {
  return [
    desiredRetention.toString(),
    maxNewCardEasyIntervalDays?.toString() ?? "",
    weights.join(","),
  ].join("|");
}

export function getCachedSchedulerValidationResult(
  key: string,
): boolean | undefined {
  const cached = schedulerSettingsValidationCache.get(key);

  if (cached === undefined) {
    return undefined;
  }

  schedulerSettingsValidationCache.delete(key);
  schedulerSettingsValidationCache.set(key, cached);

  return cached;
}

export function setCachedSchedulerValidationResult(
  key: string,
  value: boolean,
): void {
  schedulerSettingsValidationCache.delete(key);

  if (
    schedulerSettingsValidationCache.size >= schedulerValidationCacheMaxEntries
  ) {
    const oldestKey = schedulerSettingsValidationCache.keys().next().value;

    if (oldestKey !== undefined) {
      schedulerSettingsValidationCache.delete(oldestKey);
    }
  }

  schedulerSettingsValidationCache.set(key, value);
}

export function isFsrsSchedulerSettingsValid({
  desiredRetention,
  weights,
  maxNewCardEasyIntervalDays = schedulerValidationMaxNewCardEasyIntervalDays,
}: FsrsSchedulerValidationInput): boolean {
  if (!isFsrsDesiredRetentionValid(desiredRetention)) {
    return false;
  }

  if (!areFsrsWeightsWellFormed(weights)) {
    return false;
  }

  const cacheKey = buildSchedulerValidationCacheKey({
    desiredRetention,
    weights,
    maxNewCardEasyIntervalDays,
  });
  const cachedResult = getCachedSchedulerValidationResult(cacheKey);

  if (cachedResult !== undefined) {
    return cachedResult;
  }

  try {
    const scheduler = createScheduler({
      desiredRetention,
      weights,
      enableFuzz: false,
    });
    const probeCard = scheduler.newCard({ now: schedulerValidationProbeNow });
    const outcomes = new Map(
      Array.from(
        scheduler.preview({
          card: probeCard,
          now: schedulerValidationProbeNow,
        }),
        ({ grade, card }) => [grade, card] as const,
      ),
    );
    const again = outcomes.get(Rating.Again);
    const hard = outcomes.get(Rating.Hard);
    const good = outcomes.get(Rating.Good);
    const easy = outcomes.get(Rating.Easy);

    if (!again || !hard || !good || !easy) {
      return false;
    }

    // FSRS-7 may let the model skip learning steps, so only the boundary
    // grades have a fixed outcome: Again keeps learning, Easy graduates.
    const isNewFlowStateValid =
      mapStateFromFsrs(again.state) === "learning" &&
      mapStateFromFsrs(easy.state) === "review";
    const isDueOrderValid =
      again.dueAt.getTime() <= hard.dueAt.getTime() &&
      hard.dueAt.getTime() <= good.dueAt.getTime() &&
      good.dueAt.getTime() <= easy.dueAt.getTime();
    const isEasyIntervalValid =
      easy.scheduledDays > 0 &&
      easy.scheduledDays <= maxNewCardEasyIntervalDays;

    const result =
      isNewFlowStateValid && isDueOrderValid && isEasyIntervalValid;

    setCachedSchedulerValidationResult(cacheKey, result);

    return result;
  } catch {
    setCachedSchedulerValidationResult(cacheKey, false);

    return false;
  }
}
