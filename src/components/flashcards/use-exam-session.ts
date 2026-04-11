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
  };
}
