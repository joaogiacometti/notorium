/**
 * One-off FSRS-7 migration, run once after the FSRS-7 deploy is live:
 * trains each user's FSRS-7 weights from their review history, then rebuilds
 * every learned card's memory by replaying that history. Due dates, counters,
 * and learning progress are left untouched. Dry run unless `--apply` is given;
 * re-running only touches cards that still lack an FSRS-7 memory.
 *
 *   npx dotenv -e <env file with DATABASE_URL> -- npm run db:backfill:fsrs7
 *   npx dotenv -e <env file with DATABASE_URL> -- npm run db:backfill:fsrs7 -- --apply
 */
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  flashcard,
  flashcardReviewLog,
  flashcardSchedulerSettings,
} from "@/db/schema";
import {
  getDefaultFsrsWeights,
  isFsrsSchedulerSettingsValid,
  normalizeFsrsDesiredRetention,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import { createScheduler } from "@/features/flashcards/fsrs/definition";
import {
  type FlashcardMemoryRebuild,
  rebuildFlashcardMemory,
} from "@/features/flashcards/fsrs/memory-rebuild";
import {
  minimumOptimizationReviewCount,
  optimizeFsrsParameters,
} from "@/features/flashcards/fsrs/optimizer";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function trainWeights(
  userId: string,
  desiredRetention: number,
): Promise<{ weights: number[]; trainedOn: number }> {
  const logs = await db
    .select()
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId))
    .orderBy(asc(flashcardReviewLog.reviewedAt));

  const trained =
    logs.length >= minimumOptimizationReviewCount
      ? await optimizeFsrsParameters(logs)
      : null;

  return trained &&
    isFsrsSchedulerSettingsValid({ desiredRetention, weights: trained })
    ? { weights: trained, trainedOn: logs.length }
    : { weights: getDefaultFsrsWeights(), trainedOn: 0 };
}

async function loadCardHistories(userId: string) {
  const logs = await db
    .select({
      flashcardId: flashcardReviewLog.flashcardId,
      rating: flashcardReviewLog.rating,
      reviewedAt: flashcardReviewLog.reviewedAt,
    })
    .from(flashcardReviewLog)
    .where(eq(flashcardReviewLog.userId, userId))
    .orderBy(
      asc(flashcardReviewLog.reviewedAt),
      asc(flashcardReviewLog.createdAt),
    );

  return Map.groupBy(logs, (log) => log.flashcardId);
}

async function migrateUser(userId: string) {
  const [settings] = await db
    .select()
    .from(flashcardSchedulerSettings)
    .where(eq(flashcardSchedulerSettings.userId, userId))
    .limit(1);
  const desiredRetention = normalizeFsrsDesiredRetention(
    settings?.desiredRetention,
  );
  const { weights, trainedOn } = settings
    ? await trainWeights(userId, desiredRetention)
    : { weights: getDefaultFsrsWeights(), trainedOn: 0 };
  const scheduler = createScheduler({
    desiredRetention,
    weights,
    enableFuzz: false,
  });

  const [cards, histories] = await Promise.all([
    db
      .select({
        id: flashcard.id,
        state: flashcard.state,
        reviewCount: flashcard.reviewCount,
        lastReviewedAt: flashcard.lastReviewedAt,
      })
      .from(flashcard)
      .where(
        and(eq(flashcard.userId, userId), isNull(flashcard.stabilityFast)),
      ),
    loadCardHistories(userId),
  ]);

  const rebuilt = cards.map((card) => ({
    card,
    result:
      card.state === "new"
        ? null
        : rebuildFlashcardMemory(scheduler, card, histories.get(card.id) ?? []),
  }));
  const skipped = rebuilt.filter(
    (
      entry,
    ): entry is typeof entry & {
      result: FlashcardMemoryRebuild & { ok: false };
    } => entry.result?.ok === false,
  );

  console.log(
    `user ${userId}: ${cards.length} cards to migrate, ${skipped.length} skipped, weights ${trainedOn > 0 ? `trained on ${trainedOn} reviews` : "reset to FSRS-7 defaults"}`,
  );
  for (const { card, result } of skipped) {
    console.log(`  skipped ${card.id}: ${result.reason}`);
  }

  if (!apply) {
    return;
  }

  await db.transaction(async (tx: Transaction) => {
    if (settings) {
      await tx
        .update(flashcardSchedulerSettings)
        .set({
          weights: serializeFsrsWeights(weights),
          optimizedReviewCount: trainedOn,
          lastOptimizedAt: trainedOn > 0 ? new Date() : null,
        })
        .where(eq(flashcardSchedulerSettings.id, settings.id));
    }

    for (const { card, result } of rebuilt) {
      if (result?.ok === false) {
        continue;
      }
      // Only the memory changes (updatedAt included, so recency ordering stays);
      // the guards skip cards reviewed meanwhile.
      await tx
        .update(flashcard)
        .set({
          ...(result ? result.memory : { stabilityFast: "0.0000" }),
          updatedAt: sql`${flashcard.updatedAt}`,
        })
        .where(
          and(
            eq(flashcard.id, card.id),
            eq(flashcard.reviewCount, card.reviewCount),
            isNull(flashcard.stabilityFast),
          ),
        );
    }
  });
}

async function main() {
  try {
    const users = await db
      .selectDistinct({ userId: flashcard.userId })
      .from(flashcard)
      .where(isNull(flashcard.stabilityFast));

    console.log(
      `${apply ? "Applying" : "Dry run:"} FSRS-7 migration for ${users.length} users`,
    );
    for (const { userId } of users) {
      await migrateUser(userId);
    }
  } finally {
    await pool.end();
  }
}

void main();
