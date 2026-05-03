import { createEmptyCard, type Grade, Rating } from "ts-fsrs";

import {
  schedulerValidationCacheMaxEntries,
  schedulerValidationMaxNewCardEasyIntervalDays,
  schedulerValidationProbeNow,
} from "@/features/flashcards/fsrs/constants";
import { mapStateFromFsrs } from "@/features/flashcards/fsrs/mapping";
import {
  isValidDate,
  normalizeDate,
  normalizeNonNegativeInteger,
} from "@/features/flashcards/fsrs/normalization";
import { createScheduler } from "@/features/flashcards/fsrs/scheduler";
import type { FsrsSchedulerValidationInput } from "@/features/flashcards/fsrs/types";
import {
  areFsrsWeightsWellFormed,
  isFsrsDesiredRetentionValid,
} from "@/features/flashcards/fsrs/weights";

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
    const probeCard = createEmptyCard(schedulerValidationProbeNow);
    const again = scheduler.next(
      probeCard,
      schedulerValidationProbeNow,
      Rating.Again as Grade,
    ).card;
    const hard = scheduler.next(
      probeCard,
      schedulerValidationProbeNow,
      Rating.Hard as Grade,
    ).card;
    const good = scheduler.next(
      probeCard,
      schedulerValidationProbeNow,
      Rating.Good as Grade,
    ).card;
    const easy = scheduler.next(
      probeCard,
      schedulerValidationProbeNow,
      Rating.Easy as Grade,
    ).card;

    const againDue = normalizeDate(again.due, schedulerValidationProbeNow);
    const hardDue = normalizeDate(hard.due, schedulerValidationProbeNow);
    const goodDue = normalizeDate(good.due, schedulerValidationProbeNow);
    const easyDue = normalizeDate(easy.due, schedulerValidationProbeNow);

    if (
      !isValidDate(againDue) ||
      !isValidDate(hardDue) ||
      !isValidDate(goodDue) ||
      !isValidDate(easyDue)
    ) {
      return false;
    }

    const easyIntervalDays = normalizeNonNegativeInteger(easy.scheduled_days);
    const isNewFlowStateValid =
      mapStateFromFsrs(again.state) === "learning" &&
      mapStateFromFsrs(hard.state) === "learning" &&
      mapStateFromFsrs(good.state) === "learning" &&
      mapStateFromFsrs(easy.state) === "review";
    const isDueOrderValid =
      againDue.getTime() <= hardDue.getTime() &&
      hardDue.getTime() <= goodDue.getTime() &&
      goodDue.getTime() <= easyDue.getTime();
    const isEasyIntervalValid =
      easyIntervalDays > 0 && easyIntervalDays <= maxNewCardEasyIntervalDays;

    const result =
      isNewFlowStateValid && isDueOrderValid && isEasyIntervalValid;

    setCachedSchedulerValidationResult(cacheKey, result);

    return result;
  } catch {
    setCachedSchedulerValidationResult(cacheKey, false);

    return false;
  }
}
