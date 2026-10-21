import { sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import {
  REFINE_CARD_LIMIT,
  REFINE_LEECH_LAPSES,
  REFINE_RECOVERY_STREAK,
} from "@/features/flashcards/refine/constants";
import type { StrugglingFlashcard } from "@/features/flashcards/refine/types";

// The postgres driver returns array_agg as a literal like "{good,easy}", so
// rows can arrive with either shape depending on driver array parsing.
type LeechRow = StrugglingFlashcard & { recentRatings: string[] | string };

/**
 * Coerce a raw recent-ratings value into a string array, parsing Postgres
 * array literals like "{good,easy,again}".
 *
 * Example: parseRecentRatings("{good,easy}") returns ["good", "easy"]
 */
export function parseRecentRatings(value: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  const inner = value.replace(/^\{|\}$/g, "").trim();
  return inner.length === 0 ? [] : inner.split(",").map((part) => part.trim());
}

/**
 * Whether a leech's most recent ratings (newest first) are a full streak of
 * good/easy, meaning it no longer needs attention. "hard" breaks the streak.
 *
 * Example: hasRecovered(["good", "easy", "good"]) === true
 */
export function hasRecovered(recentRatings: string[]): boolean {
  const window = recentRatings.slice(0, REFINE_RECOVERY_STREAK);
  return (
    window.length >= REFINE_RECOVERY_STREAK &&
    window.every((rating) => rating === "good" || rating === "easy")
  );
}

/**
 * Keep the leeches that have not recovered, capped at the list limit.
 *
 * Example: selectStrugglingRows([{ ...card, recentRatings: ["again"] }])
 */
export function selectStrugglingRows(rows: LeechRow[]): StrugglingFlashcard[] {
  return rows
    .filter((row) => !hasRecovered(parseRecentRatings(row.recentRatings)))
    .slice(0, REFINE_CARD_LIMIT)
    .map(({ recentRatings: _recentRatings, ...card }) => card);
}

/**
 * Fetch the user's struggling cards: leeches (repeated lapses) that have not
 * recovered, most-lapsed first.
 *
 * Example: const cards = await getStrugglingFlashcardsForUser(session.user.id);
 */
export async function getStrugglingFlashcardsForUser(
  userId: string,
): Promise<StrugglingFlashcard[]> {
  const result = await getDb().execute(
    sql`
      WITH leech AS (
        SELECT f.id, f.front, f.back, f.subject_id, f.review_count,
               f.lapse_count, f.last_reviewed_at
        FROM flashcard f
        WHERE f.user_id = ${userId}
          AND f.lapse_count >= ${REFINE_LEECH_LAPSES}
      ),
      ranked AS (
        SELECT l.flashcard_id, l.rating,
               row_number() OVER (
                 PARTITION BY l.flashcard_id
                 ORDER BY l.reviewed_at DESC, l.id DESC
               ) AS rn
        FROM flashcard_review_log l
        INNER JOIN leech ON leech.id = l.flashcard_id
        WHERE l.user_id = ${userId}
      )
      SELECT leech.id, leech.front, leech.back,
             leech.subject_id AS "subjectId", d.name AS "subjectName",
             leech.review_count AS "reviewCount",
             leech.lapse_count AS "lapseCount",
             coalesce(
               array_agg(r.rating ORDER BY r.rn)
                 FILTER (WHERE r.rn <= ${REFINE_RECOVERY_STREAK}),
               '{}'
             ) AS "recentRatings"
      FROM leech
      INNER JOIN subject d ON d.id = leech.subject_id
      LEFT JOIN ranked r ON r.flashcard_id = leech.id
      GROUP BY leech.id, leech.front, leech.back, leech.subject_id, d.name,
               leech.review_count, leech.lapse_count, leech.last_reviewed_at
      ORDER BY leech.lapse_count DESC, leech.last_reviewed_at DESC NULLS LAST
    `,
  );

  const rows = (result as unknown as { rows: LeechRow[] }).rows;
  return selectStrugglingRows(rows);
}
