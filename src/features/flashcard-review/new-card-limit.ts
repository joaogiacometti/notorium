import { and, count, eq, gte, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcardReviewLog } from "@/db/schema";
import { readFsrsSettings } from "@/features/flashcards/fsrs/settings-queries";
import { calendarDay } from "@/lib/dates/format";

// A local calendar day always lies within the two days before `now`, whatever
// the offset or DST shift, so this bound lets the (userId, reviewedAt) index
// narrow the scan before the exact local-day match.
const localDayScanMs = 2 * 24 * 60 * 60 * 1000;

/**
 * A review log's local calendar day (YYYY-MM-DD) in the account time zone.
 * `reviewed_at` stores UTC wall time, so it is read as UTC first.
 *
 * @example
 * .groupBy(localReviewDay(timeZone))
 */
export function localReviewDay(timeZone: string): SQL<string> {
  return sql<string>`to_char(${flashcardReviewLog.reviewedAt} at time zone 'UTC' at time zone ${timeZone}, 'YYYY-MM-DD')`;
}

/**
 * How many more new cards the user may start today. A card counts once its
 * first grade is logged on the account's local day; undoing that grade
 * deletes the log entry, which returns the slot.
 *
 * @example
 * const remaining = await getRemainingNewCardsForToday(userId, new Date(), "UTC", 20);
 */
export async function getRemainingNewCardsForToday(
  userId: string,
  now: Date,
  timeZone: string,
  newCardsPerDay: number,
): Promise<number> {
  if (newCardsPerDay <= 0) {
    return 0;
  }

  const rows = await getDb()
    .select({ count: count() })
    .from(flashcardReviewLog)
    .where(
      and(
        eq(flashcardReviewLog.userId, userId),
        gte(
          flashcardReviewLog.reviewedAt,
          new Date(now.getTime() - localDayScanMs),
        ),
        sql`${flashcardReviewLog.previousSchedulingState}->>'state' = 'new'`,
        sql`${localReviewDay(timeZone)} = ${calendarDay(now, timeZone)}`,
      ),
    );

  return Math.max(0, newCardsPerDay - (rows[0]?.count ?? 0));
}

/**
 * Today's remaining new-card allowance under the user's saved daily limit.
 *
 * @example
 * const allowance = await getNewCardAllowanceForToday(userId, new Date(), "UTC");
 */
export async function getNewCardAllowanceForToday(
  userId: string,
  now: Date,
  timeZone: string,
): Promise<number> {
  const { newCardsPerDay } = await readFsrsSettings(userId);
  return getRemainingNewCardsForToday(userId, now, timeZone, newCardsPerDay);
}
