import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

const defaultReviewRefillThreshold = 5;

function isStillDue(card: FlashcardReviewEntity, now: Date): boolean {
  return card.dueAt.getTime() <= now.getTime();
}

function insertCardByDueAt(
  cards: FlashcardReviewEntity[],
  card: FlashcardReviewEntity,
): FlashcardReviewEntity[] {
  const nextCards = [...cards];
  const insertIndex = nextCards.findIndex(
    (candidate) => candidate.dueAt.getTime() > card.dueAt.getTime(),
  );

  if (insertIndex === -1) {
    nextCards.push(card);
    return nextCards;
  }

  nextCards.splice(insertIndex, 0, card);
  return nextCards;
}

export function applyReviewedFlashcardToState(
  state: FlashcardReviewState,
  reviewedCardId: string,
  flashcard: FlashcardReviewEntity,
  now: Date = new Date(),
): FlashcardReviewState {
  const remainingCards = state.cards.filter(
    (card) => card.id !== reviewedCardId,
  );

  if (isStillDue(flashcard, now)) {
    return {
      cards: insertCardByDueAt(remainingCards, flashcard),
      summary: state.summary,
      scheduler: state.scheduler,
    };
  }

  return {
    cards: remainingCards,
    summary: {
      ...state.summary,
      dueCount: Math.max(0, state.summary.dueCount - 1),
    },
    scheduler: state.scheduler,
  };
}

export function mergeFlashcardReviewStates(
  current: FlashcardReviewState,
  incoming: FlashcardReviewState,
): FlashcardReviewState {
  if (current.cards.length === 0) {
    return incoming;
  }

  const seenIds = new Set(current.cards.map((card) => card.id));
  const cards = [...current.cards];

  for (const card of incoming.cards) {
    if (seenIds.has(card.id)) {
      continue;
    }

    seenIds.add(card.id);
    cards.push(card);
  }

  return {
    cards,
    summary: incoming.summary,
    scheduler: incoming.scheduler,
  };
}

export function replaceFlashcardInReviewState(
  state: FlashcardReviewState,
  flashcard: FlashcardReviewEntity,
): FlashcardReviewState {
  const cardIndex = state.cards.findIndex((card) => card.id === flashcard.id);

  if (cardIndex === -1) {
    return state;
  }

  const cards = [...state.cards];
  const currentCard = cards[cardIndex];

  if (!currentCard) {
    return state;
  }

  cards[cardIndex] = {
    ...flashcard,
    subjectName: flashcard.subjectName ?? currentCard.subjectName,
  };

  return {
    cards,
    summary: state.summary,
    scheduler: state.scheduler,
  };
}

export function shouldRefillFlashcardReviewState(
  state: FlashcardReviewState,
  threshold: number = defaultReviewRefillThreshold,
): boolean {
  return (
    state.summary.dueCount > state.cards.length &&
    state.cards.length <= threshold
  );
}
