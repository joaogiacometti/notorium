import { type SQL, sql } from "drizzle-orm";
import { flashcard, flashcardReviewLog } from "@/db/schema";
import type { ReviewGrade } from "@/features/flashcards/fsrs/types";

/**
 * Struggling cards (leeches): lapsed at least STRUGGLING_LAPSE_THRESHOLD times,
 * matching Anki's first leech warning (half its default threshold of 8). A card
 * stops counting once its last STRUGGLING_RECOVERY_STREAK reviews are all
 * passing grades, so an improved card drops off after it proves itself.
 */
export const STRUGGLING_LAPSE_THRESHOLD = 4;
export const STRUGGLING_RECOVERY_STREAK = 3;
const STRUGGLING_PASS_GRADES = [
  "good",
  "easy",
] as const satisfies readonly ReviewGrade[];

/**
 * Manage-table condition matching the user's struggling flashcards.
 *
 * Example: filters.push(buildStrugglingFlashcardFilter(userId));
 */
export function buildStrugglingFlashcardFilter(userId: string): SQL {
  const recentRatings = sql`
    select ${flashcardReviewLog.rating} as rating
    from ${flashcardReviewLog}
    where ${flashcardReviewLog.userId} = ${userId}
      and ${flashcardReviewLog.flashcardId} = ${flashcard.id}
    order by ${flashcardReviewLog.reviewedAt} desc, ${flashcardReviewLog.createdAt} desc
    limit ${STRUGGLING_RECOVERY_STREAK}`;
  const passGrades = sql.join(
    STRUGGLING_PASS_GRADES.map((grade) => sql`${grade}`),
    sql`, `,
  );

  return sql`${flashcard.lapseCount} >= ${STRUGGLING_LAPSE_THRESHOLD} and (
    select count(*) from (${recentRatings}) recent
    where recent.rating in (${passGrades})
  ) < ${STRUGGLING_RECOVERY_STREAK}`;
}
