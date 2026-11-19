import { and, eq, gt, inArray, lte, or, type SQL, sql } from "drizzle-orm";
import { flashcard } from "@/db/schema";
import {
  LEARN_AHEAD_STATES,
  LEARN_AHEAD_WINDOW_MS,
} from "@/features/flashcard-review/constants";
import { activeFlashcardFilter } from "@/features/flashcards/active-filter";

/**
 * SQL twin of `isCardDueWithLearnAhead`: the single "is this card due" rule
 * shared by the review queue and the sidebar due badge, so both always count
 * the same cards (including learning cards inside the learn-ahead window).
 * Archived cards are never due.
 *
 * The outer `dueAt <= cutoff` bound is implied by both branches; stating it
 * lets Postgres range-scan the (userId, dueAt) index instead of the OR.
 *
 * @example
 * db.select().from(flashcard).where(and(eq(flashcard.userId, id), buildDueAtFilter(new Date())));
 */
export function buildDueAtFilter(now: Date): SQL<unknown> {
  const aheadCutoff = new Date(now.getTime() + LEARN_AHEAD_WINDOW_MS);
  return and(
    activeFlashcardFilter(),
    lte(flashcard.dueAt, aheadCutoff),
    or(lte(flashcard.dueAt, now), inArray(flashcard.state, LEARN_AHEAD_STATES)),
  ) as SQL<unknown>;
}

/**
 * Leading review-queue sort term: unmarked cards (`false`) before cards marked
 * study later (`true`), so deferred cards come after every other due card even
 * across batches. Mirrors `orderReviewQueue` on the client.
 *
 * @example
 * .orderBy(studyLaterLastOrder(), asc(flashcard.dueAt))
 */
export function studyLaterLastOrder(): SQL<boolean> {
  return sql<boolean>`${flashcard.studyLaterAt} is not null`;
}

/** Cards never graded yet; these count against the daily new-card limit. */
export function newFlashcardFilter(): SQL<unknown> {
  return eq(flashcard.state, "new");
}

/**
 * Review-queue sort term after `studyLaterLastOrder`: started cards due now
 * (0), then new cards (1), then learning cards inside the learn-ahead window
 * (2), so started cards are never crowded out by new ones and a short
 * learning step is only shown early when nothing else is left. Mirrors
 * `orderReviewQueue` on the client.
 *
 * @example
 * .orderBy(studyLaterLastOrder(), reviewQueueGroupOrder(now), asc(flashcard.dueAt))
 */
export function reviewQueueGroupOrder(now: Date): SQL<number> {
  return sql<number>`case when ${newFlashcardFilter()} then 1 when ${gt(flashcard.dueAt, now)} then 2 else 0 end`;
}
