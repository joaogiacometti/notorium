import { useState } from "react";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type { FlashcardReviewEntity } from "@/lib/server/api-contracts";

interface ExamSessionScope {
  deckId?: string;
}

interface ExamSession {
  cards: FlashcardReviewEntity[];
  currentIndex: number;
  ratings: ReviewGrade[];
  startedAt: Date;
  scope: ExamSessionScope;
}

interface RemoveCardResult {
  session: ExamSession | null;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createSession(
  cards: FlashcardReviewEntity[],
  scope: ExamSessionScope,
): ExamSession {
  return {
    cards: shuffleArray(cards),
    currentIndex: 0,
    ratings: [],
    startedAt: new Date(),
    scope,
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
  updatedCard: FlashcardReviewEntity,
): ExamSession {
  return {
    ...session,
    cards: session.cards.map((card) =>
      card.id === updatedCard.id ? updatedCard : card,
    ),
  };
}

function removeCardFromSession(
  session: ExamSession,
  cardId: string,
): RemoveCardResult {
  const cardIndex = session.cards.findIndex((card) => card.id === cardId);

  if (cardIndex === -1) {
    return { session };
  }

  const cards = session.cards.filter((card) => card.id !== cardId);
  const ratings = session.ratings.filter((_, index) => index !== cardIndex);

  if (cards.length === 0) {
    return { session: null };
  }

  let currentIndex = session.currentIndex;

  if (cardIndex < session.currentIndex) {
    currentIndex = Math.max(0, session.currentIndex - 1);
  } else if (cardIndex === session.currentIndex) {
    currentIndex = Math.min(session.currentIndex, cards.length - 1);
  }

  return {
    session: {
      ...session,
      cards,
      ratings,
      currentIndex,
    },
  };
}

function getProgress(session: ExamSession | null): number {
  if (!session || session.cards.length === 0) {
    return 0;
  }

  return session.currentIndex / session.cards.length;
}

export function useExamSession() {
  const [session, setSession] = useState<ExamSession | null>(null);

  function startSession(
    cards: FlashcardReviewEntity[],
    scope: ExamSessionScope,
  ) {
    setSession(createSession(cards, scope));
  }

  function rateCard(rating: ReviewGrade) {
    setSession((currentSession) =>
      currentSession ? appendRating(currentSession, rating) : currentSession,
    );
  }

  function endSession() {
    setSession(null);
  }

  function updateCard(updatedCard: FlashcardReviewEntity) {
    setSession((currentSession) =>
      currentSession
        ? replaceCard(currentSession, updatedCard)
        : currentSession,
    );
  }

  function removeCard(cardId: string) {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      return removeCardFromSession(currentSession, cardId).session;
    });
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
    endSession,
    updateCard,
    removeCard,
  };
}
