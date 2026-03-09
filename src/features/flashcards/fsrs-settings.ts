import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/index";
import {
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
} from "@/db/schema";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  getInitialFlashcardSchedulingState,
  parseFsrsWeights,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import {
  optimizeFsrsParameters,
  shouldOptimizeFsrsParameters,
} from "@/features/flashcards/fsrs-optimizer";
import type {
  FlashcardReviewLogEntity,
  FlashcardSchedulerSettingsEntity,
} from "@/lib/server/api-contracts";

interface FsrsSettings {
  row: FlashcardSchedulerSettingsEntity;
  desiredRetention: number;
  weights: number[];
}

function parseDesiredRetention(value: string | number): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function normalizeSettings(
  row: FlashcardSchedulerSettingsEntity,
): FsrsSettings {
  return {
    row,
    desiredRetention: parseDesiredRetention(row.desiredRetention),
    weights: parseFsrsWeights(row.weights),
  };
}

async function createDefaultSettings(userId: string) {
  const now = new Date();
  const resetState = getInitialFlashcardSchedulingState(now);
  return db.transaction(async (tx) => {
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
  const [existing] = await db
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
  const result = await db
    .select({ total: count() })
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId));

  return result[0]?.total ?? 0;
}

export async function getFlashcardReviewLogsForOptimization(
  userId: string,
): Promise<FlashcardReviewLogEntity[]> {
  return db
    .select()
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId));
}

export async function maybeOptimizeFsrsParameters(
  userId: string,
): Promise<void> {
  const settings = await ensureFsrsSettings(userId);
  const reviewCount = await getFlashcardReviewLogCount(userId);

  if (
    !shouldOptimizeFsrsParameters(
      reviewCount,
      settings.row.optimizedReviewCount,
    )
  ) {
    return;
  }

  const logs = await getFlashcardReviewLogsForOptimization(userId);
  const weights = await optimizeFsrsParameters(logs);

  if (!weights) {
    return;
  }

  await db
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
