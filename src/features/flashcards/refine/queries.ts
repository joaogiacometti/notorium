import { sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import {
  REFINE_BACK_SIMILARITY_THRESHOLD,
  REFINE_FRONT_SIMILARITY_THRESHOLD,
  REFINE_GROUP_LIMIT,
  REFINE_MASTERED_STREAK,
  REFINE_MERGE_CANDIDATE_LIMIT,
  REFINE_STRUGGLING_STREAK,
} from "@/features/flashcards/refine/constants";
import type {
  RefineCardSummary,
  RefineGroups,
  RefineMergeCandidate,
} from "@/features/flashcards/refine/types";
import { richTextToPlainText } from "@/lib/editor/rich-text";

// The postgres driver returns array_agg as a literal like "{good,easy}", so
// rows can arrive with either shape depending on driver array parsing.
type RefineStreakRow = RefineCardSummary & { recentRatings: string[] | string };

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
 * Classify a card's most recent ratings (newest first) into a refine group.
 * Mastered: a full streak of good/easy. Struggling: a full streak of "again".
 * "hard" is neutral and breaks both streaks.
 *
 * Example: classifyRefineStreak(["good", "easy", "good"]) === "mastered"
 */
export function classifyRefineStreak(
  recentRatings: string[],
): "mastered" | "struggling" | null {
  const masteredWindow = recentRatings.slice(0, REFINE_MASTERED_STREAK);
  if (
    masteredWindow.length >= REFINE_MASTERED_STREAK &&
    masteredWindow.every((rating) => rating === "good" || rating === "easy")
  ) {
    return "mastered";
  }

  const strugglingWindow = recentRatings.slice(0, REFINE_STRUGGLING_STREAK);
  if (
    strugglingWindow.length >= REFINE_STRUGGLING_STREAK &&
    strugglingWindow.every((rating) => rating === "again")
  ) {
    return "struggling";
  }

  return null;
}

/**
 * Split classified streak rows into capped mastered/struggling groups.
 *
 * Example: groupRefineRows([{ ...card, recentRatings: ["again", "again", "again"] }])
 */
export function groupRefineRows(rows: RefineStreakRow[]): RefineGroups {
  const mastered: RefineCardSummary[] = [];
  const struggling: RefineCardSummary[] = [];

  for (const { recentRatings, ...card } of rows) {
    const group = classifyRefineStreak(parseRecentRatings(recentRatings));
    if (group === "mastered" && mastered.length < REFINE_GROUP_LIMIT) {
      mastered.push(card);
    }
    if (group === "struggling" && struggling.length < REFINE_GROUP_LIMIT) {
      struggling.push(card);
    }
  }

  return { mastered, struggling };
}

/**
 * Fetch the user's refine groups by inspecting each card's most recent reviews.
 *
 * Example: const groups = await getRefineGroupsForUser(session.user.id);
 */
export async function getRefineGroupsForUser(
  userId: string,
): Promise<RefineGroups> {
  const windowSize = Math.max(REFINE_MASTERED_STREAK, REFINE_STRUGGLING_STREAK);
  const result = await getDb().execute(
    sql`
      WITH ranked AS (
        SELECT flashcard_id, rating,
               row_number() OVER (
                 PARTITION BY flashcard_id
                 ORDER BY reviewed_at DESC, id DESC
               ) AS rn
        FROM flashcard_review_log
        WHERE user_id = ${userId}
      ),
      recent AS (
        SELECT flashcard_id,
               array_agg(rating ORDER BY rn) AS recent_ratings
        FROM ranked
        WHERE rn <= ${windowSize}
        GROUP BY flashcard_id
        HAVING count(*) >= ${windowSize}
      )
      SELECT f.id, f.front, f.back, f.deck_id AS "deckId",
             d.name AS "deckName", f.review_count AS "reviewCount",
             f.lapse_count AS "lapseCount", r.recent_ratings AS "recentRatings"
      FROM recent r
      INNER JOIN flashcard f ON f.id = r.flashcard_id AND f.user_id = ${userId}
      INNER JOIN deck d ON d.id = f.deck_id
      ORDER BY f.last_reviewed_at DESC NULLS LAST
    `,
  );

  const rows = (result as unknown as { rows: RefineStreakRow[] }).rows;
  return groupRefineRows(rows);
}

/**
 * Find merge candidates similar to the given card via trigram similarity
 * across all the user's cards, ranking same-deck matches first.
 *
 * Example: const candidates = await findSimilarFlashcardsForUser(userId, card);
 */
export async function findSimilarFlashcardsForUser(
  userId: string,
  source: { id: string; deckId: string; front: string; back: string },
): Promise<RefineMergeCandidate[]> {
  const frontText = richTextToPlainText(source.front);
  const backText = richTextToPlainText(source.back);
  const result = await getDb().execute(
    sql`
      SELECT f.id, f.front, f.back, f.deck_id AS "deckId",
             d.name AS "deckName"
      FROM flashcard f
      INNER JOIN deck d ON d.id = f.deck_id
      WHERE f.user_id = ${userId}
        AND f.id != ${source.id}
        AND (
          similarity(f.front, ${frontText}) > ${REFINE_FRONT_SIMILARITY_THRESHOLD}
          OR similarity(f.back, ${backText}) > ${REFINE_BACK_SIMILARITY_THRESHOLD}
        )
      ORDER BY (f.deck_id = ${source.deckId}) DESC,
               greatest(
                 similarity(f.front, ${frontText}),
                 similarity(f.back, ${backText})
               ) DESC
      LIMIT ${REFINE_MERGE_CANDIDATE_LIMIT}
    `,
  );

  return (result as unknown as { rows: RefineMergeCandidate[] }).rows;
}
