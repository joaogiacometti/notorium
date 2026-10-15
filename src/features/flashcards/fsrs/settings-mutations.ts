// Write side of the FSRS scheduler settings: first-use creation, invalid-value
// repair, optimization, and preference updates. Only Server Actions, mutation
// modules, and the cron route may import this (lint-enforced).
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcardSchedulerSettings } from "@/db/schema";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  isFsrsSchedulerSettingsValid,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import {
  minimumOptimizationReviewCount,
  optimizeFsrsParameters,
} from "@/features/flashcards/fsrs/optimizer";
import {
  type FsrsSettings,
  getFlashcardReviewLogCount,
  getFlashcardReviewLogsForOptimization,
  normalizeSettings,
  selectFsrsSettingsRow,
} from "@/features/flashcards/fsrs/settings-queries";
import {
  releaseUserExpiringLock,
  tryAcquireUserExpiringLock,
} from "@/lib/rate-limit/user-rate-limit";
import type { FlashcardSchedulerSettingsEntity } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

const fsrsOptimizationLockPrefix = "lock:fsrs-optimize";
const fsrsOptimizationLockTtlSeconds = 45;
const automaticOptimizationIntervalDays = 30;

export interface FsrsOptimizationSuccess {
  success: true;
  optimizedReviewCount: number;
  lastOptimizedAt: Date;
}

export type FsrsOptimizationResult =
  | FsrsOptimizationSuccess
  | ReturnType<typeof actionError>;

export interface AutomaticFsrsOptimizationSummary {
  attempted: number;
  optimized: number;
  skipped: number;
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

// Parallel first-use requests race on the unique userId, so the insert yields
// to a concurrent winner and reuses its row instead of failing with 23505.
async function createDefaultSettings(
  userId: string,
): Promise<FlashcardSchedulerSettingsEntity> {
  const [created] = await getDb()
    .insert(flashcardSchedulerSettings)
    .values({
      userId,
      desiredRetention: getDefaultFsrsDesiredRetention().toFixed(3),
      weights: serializeFsrsWeights(getDefaultFsrsWeights()),
    })
    .onConflictDoNothing({ target: flashcardSchedulerSettings.userId })
    .returning();

  const settings = created ?? (await selectFsrsSettingsRow(userId));
  if (!settings) {
    throw new Error(
      `Failed to create flashcard scheduler settings for user ${userId}: insert conflicted but no row exists`,
    );
  }

  return settings;
}

/**
 * Load the user's scheduler settings for a write, creating the row on first
 * use and persisting defaults over invalid stored values. Mutations only;
 * reads use `readFsrsSettings`.
 *
 * @example
 * const settings = await ensureFsrsSettings(userId);
 */
export async function ensureFsrsSettings(
  userId: string,
): Promise<FsrsSettings> {
  const existing = await selectFsrsSettingsRow(userId);

  if (existing) {
    const normalized = normalizeSettings(existing);

    if (normalized.shouldResetPersistedValues) {
      await resetInvalidFsrsSettings(userId, existing.id);
    }

    return normalized;
  }

  return normalizeSettings(await createDefaultSettings(userId));
}

/**
 * Run the FSRS optimizer on the user's full review history and store the new
 * weights. Requires the minimum history and the per-user lock.
 *
 * @example
 * const result = await optimizeFsrsParametersForUser(userId);
 */
export async function optimizeFsrsParametersForUser(
  userId: string,
): Promise<FsrsOptimizationResult> {
  const [settings, reviewCount] = await Promise.all([
    ensureFsrsSettings(userId),
    getFlashcardReviewLogCount(userId),
  ]);

  if (reviewCount < minimumOptimizationReviewCount) {
    return actionError("flashcards.fsrsOptimization.notEnoughHistory");
  }

  return runFsrsOptimization(userId, settings, reviewCount);
}

async function runFsrsOptimization(
  userId: string,
  settings: FsrsSettings,
  reviewCount: number,
): Promise<FsrsOptimizationResult> {
  const acquiredLock = await tryAcquireUserExpiringLock({
    prefix: fsrsOptimizationLockPrefix,
    userId,
    ttlSeconds: fsrsOptimizationLockTtlSeconds,
  });

  if (!acquiredLock) {
    return actionError("flashcards.fsrsOptimization.locked");
  }

  const logs = await getFlashcardReviewLogsForOptimization(userId);

  let weights: number[] | null;
  try {
    weights = await optimizeFsrsParameters(logs);
  } catch {
    await releaseOptimizationLock(userId);
    return actionError("flashcards.fsrsOptimization.unavailable");
  }

  if (!weights) {
    await releaseOptimizationLock(userId);
    return actionError("flashcards.fsrsOptimization.notEnoughHistory");
  }

  if (
    !isFsrsSchedulerSettingsValid({
      desiredRetention: settings.desiredRetention,
      weights,
    })
  ) {
    // Every expected failure releases the lock so the user can retry right
    // away; this path used to hold it until the TTL expired.
    await releaseOptimizationLock(userId);
    return actionError("flashcards.fsrsOptimization.invalidResult");
  }

  const optimizedAt = new Date();
  await getDb()
    .update(flashcardSchedulerSettings)
    .set({
      weights: serializeFsrsWeights(weights),
      optimizedReviewCount: reviewCount,
      lastOptimizedAt: optimizedAt,
    })
    .where(
      and(
        eq(flashcardSchedulerSettings.userId, userId),
        eq(flashcardSchedulerSettings.id, settings.row.id),
      ),
    );

  return {
    success: true,
    optimizedReviewCount: reviewCount,
    lastOptimizedAt: optimizedAt,
  };
}

/**
 * Turn the monthly automatic optimization on or off for the user.
 *
 * @example
 * await updateFsrsOptimizationPreferences(userId, true);
 */
export async function updateFsrsOptimizationPreferences(
  userId: string,
  automaticOptimizationEnabled: boolean,
): Promise<void> {
  const settings = await ensureFsrsSettings(userId);

  await getDb()
    .update(flashcardSchedulerSettings)
    .set({
      automaticOptimizationEnabled,
    })
    .where(
      and(
        eq(flashcardSchedulerSettings.userId, userId),
        eq(flashcardSchedulerSettings.id, settings.row.id),
      ),
    );
}

/**
 * Restores the user's FSRS optimizer output to the default scheduler weights.
 *
 * @example
 * await resetFsrsOptimizationForUser("user-1");
 */
export async function resetFsrsOptimizationForUser(
  userId: string,
): Promise<void> {
  const settings = await ensureFsrsSettings(userId);

  await getDb()
    .update(flashcardSchedulerSettings)
    .set({
      weights: serializeFsrsWeights(getDefaultFsrsWeights()),
      optimizedReviewCount: 0,
      lastOptimizedAt: null,
    })
    .where(
      and(
        eq(flashcardSchedulerSettings.userId, userId),
        eq(flashcardSchedulerSettings.id, settings.row.id),
      ),
    );
}

// Successful runs leave the lock to expire via its TTL; failures release it
// early.
async function releaseOptimizationLock(userId: string): Promise<void> {
  await releaseUserExpiringLock({
    prefix: fsrsOptimizationLockPrefix,
    userId,
  });
}

function getAutomaticOptimizationCutoff(now: Date): Date {
  return new Date(
    now.getTime() - automaticOptimizationIntervalDays * 24 * 60 * 60 * 1000,
  );
}

/**
 * Cron entry point: optimize every opted-in user whose weights are older than
 * the automatic interval, one user at a time.
 *
 * @example
 * const summary = await optimizeAutomaticFsrsParameters();
 */
export async function optimizeAutomaticFsrsParameters(
  now = new Date(),
): Promise<AutomaticFsrsOptimizationSummary> {
  const staleRows = await getDb()
    .select({ userId: flashcardSchedulerSettings.userId })
    .from(flashcardSchedulerSettings)
    .where(
      and(
        eq(flashcardSchedulerSettings.automaticOptimizationEnabled, true),
        or(
          isNull(flashcardSchedulerSettings.lastOptimizedAt),
          lt(
            flashcardSchedulerSettings.lastOptimizedAt,
            getAutomaticOptimizationCutoff(now),
          ),
        ),
      ),
    );

  let optimized = 0;

  for (const row of staleRows) {
    const result = await optimizeFsrsParametersForUser(row.userId);
    if (result.success) {
      optimized += 1;
    }
  }

  return {
    attempted: staleRows.length,
    optimized,
    skipped: staleRows.length - optimized,
  };
}
