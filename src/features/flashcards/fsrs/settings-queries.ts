// Read side of the FSRS scheduler settings: nothing here writes, so GET read
// routes and Server Components can import it freely (lint-enforced). Writes
// live in settings-mutations.ts.
import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcardReviewLog, flashcardSchedulerSettings } from "@/db/schema";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  isFsrsDesiredRetentionValid,
  isFsrsSchedulerSettingsValid,
  normalizeFsrsDesiredRetention,
  parseFsrsWeightsWithValidity,
} from "@/features/flashcards/fsrs";
import type {
  FlashcardOptimizationSettings,
  FlashcardReviewLogEntity,
  FlashcardSchedulerSettingsEntity,
} from "@/lib/server/api-contracts";

export interface FsrsSettings {
  row: FlashcardSchedulerSettingsEntity;
  desiredRetention: number;
  weights: number[];
  optimizedReviewCount: number;
  lastOptimizedAt: Date | null;
  automaticOptimizationEnabled: boolean;
  shouldResetPersistedValues: boolean;
}

/** Scheduler values a read needs, without the persisted row. */
type FsrsSchedulerValues = Pick<
  FsrsSettings,
  | "desiredRetention"
  | "weights"
  | "optimizedReviewCount"
  | "lastOptimizedAt"
  | "automaticOptimizationEnabled"
>;

function parseDesiredRetention(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(value);
}

/**
 * Parse a stored settings row, substituting defaults for invalid retention or
 * weights and flagging that the row should be repaired on the next write.
 *
 * @example
 * const { weights, shouldResetPersistedValues } = normalizeSettings(row);
 */
export function normalizeSettings(
  row: FlashcardSchedulerSettingsEntity,
): FsrsSettings {
  const parsedDesiredRetention = parseDesiredRetention(row.desiredRetention);
  const parsedWeights = parseFsrsWeightsWithValidity(row.weights);
  const normalizedDesiredRetention = normalizeFsrsDesiredRetention(
    row.desiredRetention,
  );
  const isPersistedDesiredRetentionValid = isFsrsDesiredRetentionValid(
    parsedDesiredRetention,
  );
  const isSchedulerSettingsValid = isFsrsSchedulerSettingsValid({
    desiredRetention: normalizedDesiredRetention,
    weights: parsedWeights.weights,
  });
  const shouldResetPersistedValues =
    !isPersistedDesiredRetentionValid ||
    !parsedWeights.isValid ||
    !isSchedulerSettingsValid;

  if (shouldResetPersistedValues) {
    return {
      row,
      desiredRetention: getDefaultFsrsDesiredRetention(),
      weights: getDefaultFsrsWeights(),
      optimizedReviewCount: 0,
      lastOptimizedAt: null,
      automaticOptimizationEnabled: row.automaticOptimizationEnabled ?? false,
      shouldResetPersistedValues,
    };
  }

  return {
    row,
    desiredRetention: normalizedDesiredRetention,
    weights: parsedWeights.weights,
    optimizedReviewCount: row.optimizedReviewCount,
    lastOptimizedAt: row.lastOptimizedAt,
    automaticOptimizationEnabled: row.automaticOptimizationEnabled ?? false,
    shouldResetPersistedValues,
  };
}

/**
 * The user's raw scheduler settings row, if one exists.
 *
 * @example
 * const row = await selectFsrsSettingsRow(userId);
 */
export async function selectFsrsSettingsRow(
  userId: string,
): Promise<FlashcardSchedulerSettingsEntity | undefined> {
  const [existing] = await getDb()
    .select()
    .from(flashcardSchedulerSettings)
    .where(eq(flashcardSchedulerSettings.userId, userId))
    .limit(1);

  return existing;
}

/**
 * Read the user's scheduler values without writing: a missing row yields the
 * defaults and invalid persisted values are normalized in memory only. GET
 * read routes and Server Components use this; mutations that persist
 * scheduling use `ensureFsrsSettings`.
 *
 * @example
 * const { desiredRetention, weights } = await readFsrsSettings(userId);
 */
export async function readFsrsSettings(
  userId: string,
): Promise<FsrsSchedulerValues> {
  const existing = await selectFsrsSettingsRow(userId);
  if (!existing) {
    return {
      desiredRetention: getDefaultFsrsDesiredRetention(),
      weights: getDefaultFsrsWeights(),
      optimizedReviewCount: 0,
      lastOptimizedAt: null,
      automaticOptimizationEnabled: false,
    };
  }

  return toSchedulerValues(normalizeSettings(existing));
}

/**
 * How many reviews the user has logged in total.
 *
 * @example
 * const reviewCount = await getFlashcardReviewLogCount(userId);
 */
export async function getFlashcardReviewLogCount(
  userId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId));

  return result[0]?.total ?? 0;
}

/**
 * Optimization status for the account settings dialog, without writing.
 *
 * @example
 * const status = await getFsrsOptimizationSettings(userId);
 */
export async function getFsrsOptimizationSettings(
  userId: string,
): Promise<FlashcardOptimizationSettings> {
  const [settings, reviewCount] = await Promise.all([
    readFsrsSettings(userId),
    getFlashcardReviewLogCount(userId),
  ]);

  return {
    automaticOptimizationEnabled: settings.automaticOptimizationEnabled,
    lastOptimizedAt: settings.lastOptimizedAt?.toISOString() ?? null,
    optimizedReviewCount: settings.optimizedReviewCount,
    reviewCount,
  };
}

/**
 * The user's full review history in review order, as optimizer input.
 *
 * @example
 * const logs = await getFlashcardReviewLogsForOptimization(userId);
 */
export async function getFlashcardReviewLogsForOptimization(
  userId: string,
): Promise<FlashcardReviewLogEntity[]> {
  return getDb()
    .select()
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId))
    .orderBy(flashcardReviewLog.reviewedAt);
}

function toSchedulerValues(settings: FsrsSettings): FsrsSchedulerValues {
  return {
    desiredRetention: settings.desiredRetention,
    weights: settings.weights,
    optimizedReviewCount: settings.optimizedReviewCount,
    lastOptimizedAt: settings.lastOptimizedAt,
    automaticOptimizationEnabled: settings.automaticOptimizationEnabled,
  };
}
