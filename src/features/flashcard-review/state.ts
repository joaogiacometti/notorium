import { isCardDueWithLearnAhead } from "@/features/flashcard-review/constants";
import {
  type ReviewGrade,
  scheduleFlashcardReview,
} from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewSchedulerSettings,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

const defaultReviewRefillThreshold = 5;

function countDueCards(cards: FlashcardReviewEntity[], now: Date): number {
  return cards.filter((card) => isCardDueWithLearnAhead(card, now)).length;
}

function isStudyLater(card: FlashcardReviewEntity): boolean {
  return card.studyLaterAt !== null;
}

// Queue groups in order: started cards due now, new cards, learning cards
// shown ahead of time; then the same three for study-later cards. Mirrors the
// server's `studyLaterLastOrder` and `reviewQueueGroupOrder`.
function queueGroup(card: FlashcardReviewEntity, now: Date): number {
  let group = 0;
  if (card.state === "new") {
    group = 1;
  } else if (card.dueAt.getTime() > now.getTime()) {
    group = 2;
  }
  return (isStudyLater(card) ? 3 : 0) + group;
}

function shouldQueueBefore(
  card: FlashcardReviewEntity,
  candidate: FlashcardReviewEntity,
  now: Date,
): boolean {
  const cardGroup = queueGroup(card, now);
  const candidateGroup = queueGroup(candidate, now);
  if (cardGroup !== candidateGroup) {
    return candidateGroup > cardGroup;
  }

  return candidate.dueAt.getTime() > card.dueAt.getTime();
}

function insertCardInQueue(
  cards: FlashcardReviewEntity[],
  card: FlashcardReviewEntity,
  now: Date,
): FlashcardReviewEntity[] {
  const nextCards = [...cards];
  const insertIndex = nextCards.findIndex((candidate) =>
    shouldQueueBefore(card, candidate, now),
  );

  if (insertIndex === -1) {
    nextCards.push(card);
    return nextCards;
  }

  nextCards.splice(insertIndex, 0, card);
  return nextCards;
}

/**
 * Stable sort into queue groups: started cards due now, new cards, learning
 * cards shown ahead of time, then study-later cards, matching the server's
 * review-queue sort. Order within a group is kept.
 *
 * @example
 * const cards = orderReviewQueue([...current.cards, ...incoming.cards], new Date());
 */
export function orderReviewQueue(
  cards: FlashcardReviewEntity[],
  now: Date,
): FlashcardReviewEntity[] {
  return [...cards].sort((a, b) => queueGroup(a, now) - queueGroup(b, now));
}

/**
 * Set or clear a card's study-later mark. Marking moves the card to the end
 * of the queue; clearing leaves it where it is.
 *
 * @example
 * commitReviewState(setFlashcardStudyLaterInState(state, card.id, new Date()));
 */
export function setFlashcardStudyLaterInState(
  state: FlashcardReviewState,
  cardId: string,
  studyLaterAt: Date | null,
): FlashcardReviewState {
  const target = state.cards.find((card) => card.id === cardId);
  if (!target) {
    return state;
  }

  const updated = { ...target, studyLaterAt };
  const cards = studyLaterAt
    ? [...state.cards.filter((card) => card.id !== cardId), updated]
    : state.cards.map((card) => (card.id === cardId ? updated : card));
  return { ...state, cards };
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

  if (isCardDueWithLearnAhead(flashcard, now)) {
    return {
      cards: insertCardInQueue(remainingCards, flashcard, now),
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
  now: Date,
): FlashcardReviewState {
  if (current.cards.length === 0) {
    return {
      ...incoming,
      summary: {
        ...incoming.summary,
        dueCount: Math.max(
          incoming.summary.dueCount,
          countDueCards(incoming.cards, now),
        ),
      },
    };
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

  const actualDueCount = countDueCards(cards, now);

  return {
    cards: orderReviewQueue(cards, now),
    summary: {
      ...incoming.summary,
      dueCount: Math.max(incoming.summary.dueCount, actualDueCount),
    },
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
  cards[cardIndex] = {
    ...state.cards[cardIndex],
    ...flashcard,
    folderName: flashcard.folderName ?? state.cards[cardIndex].folderName,
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

/**
 * Remove cards from the local review state and lower the due/total counts,
 * for when the server state cannot be re-read (e.g. after a delete or a move
 * out of scope while offline).
 *
 * @example
 * commitReviewState(removeFlashcardsFromReviewState(state, [deletedId]));
 */
export function removeFlashcardsFromReviewState(
  state: FlashcardReviewState,
  removedIds: string[],
): FlashcardReviewState {
  const removedIdSet = new Set(removedIds);
  return {
    ...state,
    cards: state.cards.filter((card) => !removedIdSet.has(card.id)),
    summary: {
      dueCount: Math.max(0, state.summary.dueCount - removedIds.length),
      totalCount: Math.max(0, state.summary.totalCount - removedIds.length),
    },
  };
}

/**
 * Schedule a grade the way the server persists it. A learning card graded
 * inside its learn-ahead window is scheduled from the actual review time:
 * FSRS-7 models sub-day intervals, so an early recall earns a smaller
 * stability gain instead of being credited with the full planned delay.
 * Shared by the server mutation and the client's optimistic grade so both
 * compute the same next state.
 *
 * @example
 * const next = scheduleGradeAt({ card, grade: "good", scheduler, reviewedAt: new Date() });
 */
export function scheduleGradeAt({
  card,
  grade,
  scheduler,
  reviewedAt,
}: {
  card: Parameters<typeof scheduleFlashcardReview>[0]["card"];
  grade: ReviewGrade;
  scheduler: FlashcardReviewSchedulerSettings;
  reviewedAt: Date;
}): ReturnType<typeof scheduleFlashcardReview> {
  return scheduleFlashcardReview({
    card,
    grade,
    now: reviewedAt,
    desiredRetention: scheduler.desiredRetention,
    weights: scheduler.weights,
  });
}

/**
 * The card as it will look after the server applies the grade, so the review
 * queue can advance before the save round-trip finishes.
 *
 * @example
 * const graded = gradeFlashcardLocally(card, "again", state.scheduler, new Date());
 */
export function gradeFlashcardLocally(
  card: FlashcardReviewEntity,
  grade: ReviewGrade,
  scheduler: FlashcardReviewSchedulerSettings,
  reviewedAt: Date,
): FlashcardReviewEntity {
  const next = scheduleGradeAt({ card, grade, scheduler, reviewedAt });
  return {
    ...card,
    state: next.state,
    dueAt: next.dueAt,
    stability: next.stability,
    stabilityFast: next.stabilityFast,
    difficulty: next.difficulty,
    intervalDays: next.intervalDays,
    learningStep: next.learningStep,
    lastReviewedAt: reviewedAt,
    reviewCount: next.reviewCount,
    lapseCount: next.lapseCount,
  };
}

/**
 * Put a card back at the front of the queue: a grade that failed to save (in
 * its pre-grade form), or an archive that failed or was undone. Restores the
 * due count when the card had left the queue, and with `restoreTotal` the
 * total too, for cards that had left the session entirely.
 *
 * @example
 * commitReviewState(restoreFlashcardToFront(state, cardBeforeGrade));
 */
export function restoreFlashcardToFront(
  state: FlashcardReviewState,
  card: FlashcardReviewEntity,
  { restoreTotal = false }: { restoreTotal?: boolean } = {},
): FlashcardReviewState {
  const returned = state.cards.some((queued) => queued.id === card.id) ? 0 : 1;
  return {
    ...state,
    cards: [card, ...state.cards.filter((queued) => queued.id !== card.id)],
    summary: {
      dueCount: state.summary.dueCount + returned,
      totalCount: state.summary.totalCount + (restoreTotal ? returned : 0),
    },
  };
}

/**
 * Drop cards from a fetched state whose grade had not been saved when the
 * fetch was answered: the server still reports them as due, and keeping them
 * would show an already-graded card again.
 *
 * @example
 * const fresh = excludeFlashcardsFromFetchedState(fetched, new Set([gradedId]));
 */
export function excludeFlashcardsFromFetchedState(
  state: FlashcardReviewState,
  excludedIds: ReadonlySet<string>,
): FlashcardReviewState {
  const cards = state.cards.filter((card) => !excludedIds.has(card.id));
  const removedCount = state.cards.length - cards.length;
  return {
    ...state,
    cards,
    summary: {
      ...state.summary,
      dueCount: Math.max(0, state.summary.dueCount - removedCount),
    },
  };
}
