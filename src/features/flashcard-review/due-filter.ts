import { and, inArray, lte, or, type SQL } from "drizzle-orm";
import { flashcard } from "@/db/schema";
import {
  LEARN_AHEAD_STATES,
  LEARN_AHEAD_WINDOW_MS,
} from "@/features/flashcard-review/constants";

/**
 * SQL twin of `isCardDueWithLearnAhead`: the single "is this card due" rule
 * shared by the review queue and the sidebar due badge, so both always count
 * the same cards (including learning cards inside the learn-ahead window).
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
    lte(flashcard.dueAt, aheadCutoff),
    or(lte(flashcard.dueAt, now), inArray(flashcard.state, LEARN_AHEAD_STATES)),
  ) as SQL<unknown>;
}
