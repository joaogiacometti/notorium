import { useState } from "react";
import { shuffleExamCards } from "@/features/flashcard-review/exam";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type { FlashcardReviewEntity } from "@/lib/server/api-contracts";

type ExamCardPatch = Pick<FlashcardReviewEntity, "id"> &
  Partial<FlashcardReviewEntity>;

interface ExamSession {
  cards: FlashcardReviewEntity[];
  currentIndex: number;
  ratings: ReviewGrade[];
  startedAt: Date;
}

function createSession(cards: FlashcardReviewEntity[]): ExamSession {
  return {
    cards,
    currentIndex: 0,
    ratings: [],
    startedAt: new Date(),
  };
}

function appendRating(session: ExamSession, rating: ReviewGrade): ExamSession {
  return {
    ...session,
    currentIndex: session.currentIndex + 1,
    ratings: [...session.ratings, rating],
  };
}

function replaceCard(
  session: ExamSession,
  updatedCard: ExamCardPatch,
): ExamSession {
  return {
    ...session,
    cards: session.cards.map((card) =>
      card.id === updatedCard.id ? { ...card, ...updatedCard } : card,
    ),
  };
}

function removeCardFromSession(
  session: ExamSession,
  cardId: string,
): ExamSession | null {
  const cardIndex = session.cards.findIndex((card) => card.id === cardId);

  if (cardIndex === -1) {
    return session;
  }

  const cards = session.cards.filter((card) => card.id !== cardId);
  const ratings = session.ratings.filter((_, index) => index !== cardIndex);

  if (cards.length === 0) {
    return null;
  }

  let currentIndex = session.currentIndex;

  if (cardIndex < session.currentIndex) {
    currentIndex = Math.max(0, session.currentIndex - 1);
  } else if (cardIndex === session.currentIndex) {
    currentIndex = Math.min(session.currentIndex, cards.length - 1);
  }

  return { ...session, cards, ratings, currentIndex };
}

function getProgress(session: ExamSession | null): number {
  if (!session || session.cards.length === 0) {
    return 0;
  }

  return session.currentIndex / session.cards.length;
}

/**
 * Holds one exam run. `initialCards` is used as given (the exam page shuffles
 * on the server so hydration matches); `startSession` reshuffles for retries.
 *
 * @example
 * const examSession = useExamSession(shuffledCards);
 */
export function useExamSession(initialCards: FlashcardReviewEntity[]) {
  const [session, setSession] = useState<ExamSession | null>(() =>
    createSession(initialCards),
  );

  function startSession(cards: FlashcardReviewEntity[]) {
    setSession(createSession(shuffleExamCards(cards)));
  }

  function rateCard(rating: ReviewGrade) {
    setSession((currentSession) =>
      currentSession ? appendRating(currentSession, rating) : currentSession,
    );
  }

  function updateCard(updatedCard: ExamCardPatch) {
    setSession((currentSession) =>
      currentSession
        ? replaceCard(currentSession, updatedCard)
        : currentSession,
    );
  }

  function removeCard(cardId: string) {
    setSession((currentSession) =>
      currentSession
        ? removeCardFromSession(currentSession, cardId)
        : currentSession,
    );
  }

  const currentCard = session?.cards[session.currentIndex] ?? null;
  const hasStarted = (session?.ratings.length ?? 0) > 0;
  const sessionComplete = session
    ? session.currentIndex >= session.cards.length
    : false;
  const progress = getProgress(session);

  return {
    session,
    currentCard,
    hasStarted,
    sessionComplete,
    progress,
    startSession,
    rateCard,
    updateCard,
    removeCard,
  };
}
