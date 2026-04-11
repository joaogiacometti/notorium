import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import {
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
} from "@/db/schema";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  getInitialFlashcardSchedulingState,
  isFsrsDesiredRetentionValid,
  isFsrsSchedulerSettingsValid,
  normalizeFsrsDesiredRetention,
  parseFsrsWeightsWithValidity,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import {
  optimizeFsrsParameters,
  shouldOptimizeFsrsParameters,
} from "@/features/flashcards/fsrs-optimizer";
import { tryAcquireUserExpiringLock } from "@/lib/rate-limit/user-rate-limit";
import type {
  FlashcardReviewLogEntity,
  FlashcardSchedulerSettingsEntity,
} from "@/lib/server/api-contracts";

const fsrsOptimizationLockPrefix = "lock:fsrs-optimize";
const fsrsOptimizationLockTtlSeconds = 45;
interface FsrsSettings {
  row: FlashcardSchedulerSettingsEntity;
  desiredRetention: number;
  weights: number[];
  optimizedReviewCount: number;
  shouldResetPersistedValues: boolean;
}

function parseDesiredRetention(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(value);
}

function normalizeSettings(
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
      shouldResetPersistedValues,
    };
  }

  return {
    row,
    desiredRetention: normalizedDesiredRetention,
    weights: parsedWeights.weights,
    optimizedReviewCount: row.optimizedReviewCount,
    shouldResetPersistedValues,
  };
}

async function resetInvalidFsrsSettings(
  userId: string,
  settingsId: string,
): Promise<void> {
  await getDb()
    .update(flashcardSchedulerSettings)
    .set({
      desiredRetention: getDefaultFsrsDesiredRetention().toFixed(3),
      weights: serializeFsrsWeights(getDefaultFsrsWeights()),
      optimizedReviewCount: 0,
      lastOptimizedAt: null,
    })
    .where(
      and(
        eq(flashcardSchedulerSettings.userId, userId),
        eq(flashcardSchedulerSettings.id, settingsId),
      ),
    );
}

async function createDefaultSettings(userId: string) {
  const now = new Date();
  const resetState = getInitialFlashcardSchedulingState(now);
  return getDb().transaction(async (tx) => {
    const [created] = await tx
      .insert(flashcardSchedulerSettings)
      .values({
        userId,
        desiredRetention: getDefaultFsrsDesiredRetention().toFixed(3),
        weights: serializeFsrsWeights(getDefaultFsrsWeights()),
        legacySchedulerMigratedAt: now,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create flashcard scheduler settings");
    }

    await tx
      .update(flashcard)
      .set({
        state: resetState.state,
        dueAt: resetState.dueAt,
        stability: resetState.stability,
        difficulty: resetState.difficulty,
        ease: resetState.ease,
        intervalDays: resetState.intervalDays,
        learningStep: resetState.learningStep,
        lastReviewedAt: resetState.lastReviewedAt,
        reviewCount: resetState.reviewCount,
        lapseCount: resetState.lapseCount,
        updatedAt: now,
      })
      .where(eq(flashcard.userId, userId));

    return created;
  });
}

export async function ensureFsrsSettings(
  userId: string,
): Promise<FsrsSettings> {
  const [existing] = await getDb()
    .select()
    .from(flashcardSchedulerSettings)
    .where(eq(flashcardSchedulerSettings.userId, userId))
    .limit(1);

  if (existing) {
    const normalized = normalizeSettings(existing);

    if (normalized.shouldResetPersistedValues) {
      await resetInvalidFsrsSettings(userId, existing.id);
    }

    return normalized;
  }

  return normalizeSettings(await createDefaultSettings(userId));
}

export async function getFlashcardReviewLogCount(
  userId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId));

  return result[0]?.total ?? 0;
}

export async function getFlashcardReviewLogsForOptimization(
  userId: string,
): Promise<FlashcardReviewLogEntity[]> {
  return getDb()
    .select()
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId))
    .orderBy(flashcardReviewLog.reviewedAt);
}

export async function maybeOptimizeFsrsParameters(
  userId: string,
): Promise<void> {
  const [settings, reviewCount] = await Promise.all([
    ensureFsrsSettings(userId),
    getFlashcardReviewLogCount(userId),
  ]);

  if (
    !shouldOptimizeFsrsParameters(reviewCount, settings.optimizedReviewCount)
  ) {
    return;
  }

  const acquiredLock = await tryAcquireUserExpiringLock({
    prefix: fsrsOptimizationLockPrefix,
    userId,
    ttlSeconds: fsrsOptimizationLockTtlSeconds,
  });

  if (!acquiredLock) {
    return;
  }

  const logs = await getFlashcardReviewLogsForOptimization(userId);
  const weights = await optimizeFsrsParameters(logs);

  if (!weights) {
    return;
  }

  if (
    !isFsrsSchedulerSettingsValid({
      desiredRetention: settings.desiredRetention,
      weights,
    })
  ) {
    return;
  }

  await getDb()
    .update(flashcardSchedulerSettings)
    .set({
      weights: serializeFsrsWeights(weights),
      optimizedReviewCount: reviewCount,
      lastOptimizedAt: new Date(),
    })
    .where(
      and(
        eq(flashcardSchedulerSettings.userId, userId),
        eq(flashcardSchedulerSettings.id, settings.row.id),
      ),
    );
}
