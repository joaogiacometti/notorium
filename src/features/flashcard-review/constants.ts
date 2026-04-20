import type { FlashcardReviewEntity } from "@/lib/server/api-contracts";

export const LEARN_AHEAD_WINDOW_MS = 20 * 60 * 1000;

export const LEARN_AHEAD_STATES = ["learning", "relearning"] as const;

type LearnAheadState = (typeof LEARN_AHEAD_STATES)[number];
const learnAheadStates: ReadonlySet<LearnAheadState> = new Set(
  LEARN_AHEAD_STATES,
);

export function isCardDueWithLearnAhead(
  card: Pick<FlashcardReviewEntity, "state" | "dueAt">,
  now: Date,
): boolean {
  if (card.dueAt.getTime() <= now.getTime()) {
    return true;
  }

  if (learnAheadStates.has(card.state as LearnAheadState)) {
    return card.dueAt.getTime() <= now.getTime() + LEARN_AHEAD_WINDOW_MS;
  }

  return false;
}
