"use client";

import { useState } from "react";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type { FlashcardReviewEntity } from "@/lib/server/api-contracts";
import { useExamSession } from "./use-exam-session";

interface UseFlashcardExamControllerParams {
  initialCards: FlashcardReviewEntity[];
  resetCardViewState: () => void;
  onExit: () => void;
}

/**
 * Coordinates one exam run on the exam page: grading, exit confirmation,
 * weak-card retries, and in-session card edits.
 *
 * @example
 * const exam = useFlashcardExamController({
 *   initialCards,
 *   resetCardViewState,
 *   onExit: () => router.push(hubHref),
 * });
 */
export function useFlashcardExamController({
  initialCards,
  resetCardViewState,
  onExit,
}: UseFlashcardExamControllerParams) {
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const examSession = useExamSession(initialCards);

  function handleGrade(grade: ReviewGrade) {
    if (!examSession.currentCard) {
      return;
    }

    examSession.rateCard(grade);
    resetCardViewState();
  }

  function handleExit() {
    if (examSession.hasStarted && !examSession.sessionComplete) {
      setShowExitConfirmation(true);
      return;
    }

    onExit();
  }

  function handleConfirmExit() {
    setShowExitConfirmation(false);
    onExit();
  }

  function handleRetryWeakCards() {
    const session = examSession.session;
    if (!session) {
      return;
    }

    const weakCards = session.cards.filter((_card, index) => {
      const rating = session.ratings[index];
      return rating === "again" || rating === "hard";
    });

    if (weakCards.length === 0) {
      return;
    }

    examSession.startSession(weakCards);
    resetCardViewState();
  }

  function updateExamCard(updatedFlashcard: FlashcardReviewEntity) {
    examSession.updateCard(updatedFlashcard);
    resetCardViewState();
  }

  function removeExamCard(deletedId: string) {
    examSession.removeCard(deletedId);
    resetCardViewState();
  }

  return {
    currentCard: examSession.currentCard,
    session: examSession.session,
    progress: examSession.progress,
    sessionComplete: examSession.sessionComplete,
    showExitConfirmation,
    setShowExitConfirmation,
    handleGrade,
    handleExit,
    handleConfirmExit,
    handleRetryWeakCards,
    updateExamCard,
    removeExamCard,
  };
}
