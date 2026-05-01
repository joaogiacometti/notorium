"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getExamFlashcards } from "@/app/actions/flashcard-review";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { useExamSession } from "./use-exam-session";

interface UseFlashcardExamControllerParams {
  selectedDeckId?: string;
  isPending: boolean;
  resetFocusViewState: () => void;
  setFocusMode: (isFocusMode: boolean) => void;
}

function getExamScopeKey(deckId?: string) {
  return deckId ?? "all";
}

/**
 * Coordinates review-page exam card loading and session transitions.
 *
 * @example
 * const examController = useFlashcardExamController({
 *   selectedDeckId,
 *   isPending,
 *   resetFocusViewState,
 *   setFocusMode,
 * });
 */
export function useFlashcardExamController({
  selectedDeckId,
  isPending,
  resetFocusViewState,
  setFocusMode,
}: UseFlashcardExamControllerParams) {
  const [examCards, setExamCards] = useState<FlashcardReviewEntity[] | null>(
    null,
  );
  const [isLoadingExamCards, setIsLoadingExamCards] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const examScopeRef = useRef<{ deckId?: string }>({});
  const examCardsRequestIdRef = useRef(0);
  const examCardsRequestRef = useRef<{
    scopeKey: string;
    promise: Promise<FlashcardReviewEntity[] | null>;
  } | null>(null);
  const examSession = useExamSession();
  const examSessionData = examSession.session;
  const isExamMode = !!examSessionData;

  useEffect(() => {
    if (examScopeRef.current.deckId !== selectedDeckId) {
      setExamCards(null);
      examScopeRef.current = { deckId: selectedDeckId };
      examCardsRequestIdRef.current += 1;
      examCardsRequestRef.current = null;
      setIsLoadingExamCards(false);
    }
  }, [selectedDeckId]);

  async function ensureExamCardsLoaded(): Promise<
    FlashcardReviewEntity[] | null
  > {
    if (examCards !== null) {
      return examCards;
    }

    const scopeKey = getExamScopeKey(selectedDeckId);
    if (examCardsRequestRef.current?.scopeKey === scopeKey) {
      return examCardsRequestRef.current.promise;
    }

    const requestId = examCardsRequestIdRef.current + 1;
    examCardsRequestIdRef.current = requestId;

    setIsLoadingExamCards(true);
    const request = getExamFlashcards({ deckId: selectedDeckId })
      .then((cards) => {
        if (examCardsRequestIdRef.current === requestId) {
          setExamCards(cards);
        }

        return cards;
      })
      .catch(() => {
        if (examCardsRequestIdRef.current === requestId) {
          toast.error("Could not load exam cards. Please try again.");
        }

        return null;
      })
      .finally(() => {
        if (examCardsRequestIdRef.current === requestId) {
          setIsLoadingExamCards(false);
          examCardsRequestRef.current = null;
        }
      });

    examCardsRequestRef.current = { scopeKey, promise: request };
    return request;
  }

  function closeFocusMode() {
    examSession.endSession();
    setFocusMode(false);
    resetFocusViewState();
  }

  function handleStartReviewMode() {
    examSession.endSession();
    resetFocusViewState();
    setFocusMode(true);
  }

  async function handleStartExamMode() {
    const cards = examCards ?? (await ensureExamCardsLoaded());

    if (!cards || cards.length === 0) {
      return;
    }

    examSession.startSession(cards, { deckId: selectedDeckId });
    resetFocusViewState();
    setFocusMode(true);
  }

  function handleGradeInExamMode(
    currentCard: FlashcardReviewEntity | null,
    grade: ReviewGrade,
  ) {
    if (!currentCard || isPending) {
      return;
    }

    examSession.rateCard(grade);
    resetFocusViewState();
  }

  function handleExitExamMode() {
    if (examSession.hasStarted && !examSession.sessionComplete) {
      setShowExitConfirmation(true);
    } else {
      closeFocusMode();
    }
  }

  function handleConfirmExitExam() {
    setShowExitConfirmation(false);
    closeFocusMode();
  }

  function handleCloseResults() {
    closeFocusMode();
  }

  function handleRetryWeakCards() {
    if (!examSession.session) {
      return;
    }

    const weakCards = examSession.session.cards.filter((_card, index) => {
      const rating = examSession.session?.ratings[index];
      return rating === "again" || rating === "hard";
    });

    if (weakCards.length === 0) {
      return;
    }

    examSession.startSession(weakCards, { deckId: selectedDeckId });
    resetFocusViewState();
    setFocusMode(true);
  }

  function updateExamCard(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    examSession.updateCard(updatedFlashcard);
    resetFocusViewState();
  }

  function removeExamCard(deletedId: string) {
    examSession.removeCard(deletedId);
    resetFocusViewState();
  }

  return {
    currentCard: examSession.currentCard,
    examSession,
    examSessionData,
    handleCloseResults,
    handleConfirmExitExam,
    handleExitExamMode,
    handleGradeInExamMode,
    handleRetryWeakCards,
    handleStartExamMode,
    handleStartReviewMode,
    isExamMode,
    isLoadingExamCards,
    progress: examSession.progress,
    removeExamCard,
    setShowExitConfirmation,
    showExitConfirmation,
    updateExamCard,
  };
}
