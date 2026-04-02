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
  normalizeFsrsDesiredRetention,
  parseFsrsWeights,
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
}

function normalizeSettings(
  row: FlashcardSchedulerSettingsEntity,
): FsrsSettings {
  return {
    row,
    desiredRetention: normalizeFsrsDesiredRetention(row.desiredRetention),
    weights: parseFsrsWeights(row.weights),
  };
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
    return normalizeSettings(existing);
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
    !shouldOptimizeFsrsParameters(
      reviewCount,
      settings.row.optimizedReviewCount,
    )
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
