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

  if (isCardDueWithLearnAhead(flashcard, now)) {
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
    cards,
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
    subjectName: flashcard.subjectName ?? state.cards[cardIndex].subjectName,
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
 * inside its learn-ahead window is scheduled from its due time, so reviewing
 * early never shortens the next interval. Shared by the server mutation and
 * the client's optimistic grade so both compute the same next state.
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
    now: new Date(Math.max(reviewedAt.getTime(), card.dueAt.getTime())),
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
    difficulty: next.difficulty,
    intervalDays: next.intervalDays,
    learningStep: next.learningStep,
    lastReviewedAt: reviewedAt,
    reviewCount: next.reviewCount,
    lapseCount: next.lapseCount,
  };
}

/**
 * Put a card whose grade failed to save back at the front of the queue in its
 * pre-grade form, restoring the due count when the optimistic grade had
 * removed it from the queue.
 *
 * @example
 * commitReviewState(restoreFlashcardToFront(state, cardBeforeGrade));
 */
export function restoreFlashcardToFront(
  state: FlashcardReviewState,
  card: FlashcardReviewEntity,
): FlashcardReviewState {
  const wasQueued = state.cards.some((queued) => queued.id === card.id);
  return {
    ...state,
    cards: [card, ...state.cards.filter((queued) => queued.id !== card.id)],
    summary: {
      ...state.summary,
      dueCount: state.summary.dueCount + (wasQueued ? 0 : 1),
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
