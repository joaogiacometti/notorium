import { useState } from "react";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type { FlashcardReviewEntity } from "@/lib/server/api-contracts";

interface ExamSessionScope {
  subjectId?: string;
  deckId?: string;
}

interface ExamSession {
  cards: FlashcardReviewEntity[];
  currentIndex: number;
  ratings: ReviewGrade[];
  startedAt: Date;
  scope: ExamSessionScope;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useExamSession() {
  const [session, setSession] = useState<ExamSession | null>(null);

  function startSession(
    cards: FlashcardReviewEntity[],
    scope: ExamSessionScope,
  ) {
    setSession({
      cards: shuffleArray(cards),
      currentIndex: 0,
      ratings: [],
      startedAt: new Date(),
      scope,
    });
  }

  function rateCard(rating: ReviewGrade) {
    if (!session) return;

    const nextIndex = session.currentIndex + 1;
    setSession({
      ...session,
      currentIndex: nextIndex,
      ratings: [...session.ratings, rating],
    });
  }

  function endSession() {
    setSession(null);
  }

  function updateCard(updatedCard: FlashcardReviewEntity) {
    if (!session) return;

    setSession({
      ...session,
      cards: session.cards.map((card) =>
        card.id === updatedCard.id ? updatedCard : card,
      ),
    });
  }

  function removeCard(cardId: string) {
    if (!session) return;

    const cardIndex = session.cards.findIndex((card) => card.id === cardId);
    if (cardIndex === -1) return;

    const newCards = session.cards.filter((card) => card.id !== cardId);
    const newRatings = session.ratings.filter(
      (_, index) => index !== cardIndex,
    );

    if (newCards.length === 0) {
      endSession();
      return;
    }

    let newIndex = session.currentIndex;
    if (cardIndex < session.currentIndex) {
      newIndex = Math.max(0, session.currentIndex - 1);
    } else if (cardIndex === session.currentIndex) {
      newIndex = Math.min(session.currentIndex, newCards.length - 1);
    }

    setSession({
      ...session,
      cards: newCards,
      currentIndex: newIndex,
      ratings: newRatings,
    });
  }

  const currentCard = session?.cards[session.currentIndex] ?? null;
  const hasStarted = (session?.ratings.length ?? 0) > 0;
  const sessionComplete = session
    ? session.currentIndex >= session.cards.length
    : false;
  let progress = 0;
  if (session && session.cards.length > 0) {
    progress = session.currentIndex / session.cards.length;
  }

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
