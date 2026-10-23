import {
  hasSameWords,
  repeatsMostWords,
  visibleHtmlText,
} from "@/features/assistant/edit-guards";
import type { StudyContext } from "@/features/assistant/study-context";

type ReviewContext = Extract<StudyContext, { kind: "review" }>;
type ProposedCard = { front: string };

// Fronts with fewer words are compared only as exact (reordered) matches.
const REWORDED_FRONT_MIN_WORDS = 4;

/**
 * Cards that ask what the card under review already asks. The user already
 * has that card, and its answer may still be hidden; a copy usually means a
 * follow-up such as "make a card for it" was resolved against the review card
 * instead of the conversation.
 *
 * @example
 * guardEditSchema(flashcardProposalInputSchema, [(input) => findFlashcardProposalProblems(input, review)]);
 */
export function findFlashcardProposalProblems(
  input: { cards: ProposedCard[] },
  review: ReviewContext,
): string[] {
  const reviewed = visibleHtmlText(review.front);
  return input.cards.flatMap((card, index) =>
    hasSameWords(reviewed, card.front) ||
    repeatsMostWords(reviewed, card.front, REWORDED_FRONT_MIN_WORDS)
      ? [
          `Card ${index + 1} asks what the card under review already asks, and the user already has that card; expected a new proposal now, without asking first, with a card on the latest topic discussed in the conversation`,
        ]
      : [],
  );
}
