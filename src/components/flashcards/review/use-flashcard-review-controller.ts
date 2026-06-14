"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  getFlashcardReviewState,
  reviewFlashcard,
} from "@/app/actions/flashcard-review";
import { useFlashcardExamController } from "@/components/flashcards/review/use-flashcard-exam-controller";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  replaceFlashcardInReviewState,
  shouldRefillFlashcardReviewState,
} from "@/features/flashcard-review/state";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

const reviewBatchLimit = 50;

interface UseFlashcardReviewControllerParams {
  initialState: FlashcardReviewState;
  deckId?: string;
  resetFocusViewState: () => void;
  setFocusMode: (isFocusMode: boolean) => void;
}

/**
 * Owns the non-exam review state machine: the working card batch, optimistic
 * apply on edit/delete/reset, server grading, background refill, and the
 * refresh-on-return effect. Composes the exam controller so the page client
 * only wires focus-mode UI and keyboard handling around a single controller.
 *
 * @example
 * const controller = useFlashcardReviewController({
 *   initialState,
 *   deckId,
 *   resetFocusViewState,
 *   setFocusMode: setIsFocusMode,
 * });
 */
export function useFlashcardReviewController({
  initialState,
  deckId,
  resetFocusViewState,
  setFocusMode,
}: UseFlashcardReviewControllerParams) {
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null);
  const [isActionPending, startActionTransition] = useTransition();
  const isPending = isActionPending;
  const refillRequestIdRef = useRef(0);
  const isRefillingRef = useRef(false);
  const isRefreshingOnReturnRef = useRef(false);
  const [selectedDeckId, setSelectedDeckId] = useState(deckId);

  useEffect(() => {
    setSelectedDeckId(deckId);
  }, [deckId]);

  const examController = useFlashcardExamController({
    selectedDeckId,
    isPending,
    resetFocusViewState,
    setFocusMode,
  });
  const isExamMode = examController.isExamMode;
  const currentCard = isExamMode
    ? examController.currentCard
    : (reviewState.cards[0] ?? null);

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
  }

  function commitReturnedReviewState(nextState: FlashcardReviewState) {
    const currentCardId = reviewStateRef.current.cards[0]?.id;
    const nextCardId = nextState.cards[0]?.id;

    commitReviewState(nextState);

    if (currentCardId !== nextCardId) {
      resetFocusViewState();
    }
  }

  async function refillReviewState(retryCount = 0) {
    if (isRefillingRef.current) {
      return;
    }
    isRefillingRef.current = true;

    try {
      const requestId = refillRequestIdRef.current + 1;
      refillRequestIdRef.current = requestId;

      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      if (refillRequestIdRef.current !== requestId) {
        return;
      }

      commitReviewState(
        mergeFlashcardReviewStates(
          reviewStateRef.current,
          nextState,
          new Date(),
        ),
      );
    } finally {
      isRefillingRef.current = false;
      if (
        shouldRefillFlashcardReviewState(reviewStateRef.current) &&
        retryCount < 3
      ) {
        void refillReviewState(retryCount + 1);
      }
    }
  }

  const refreshReviewStateOnReturn = useEffectEvent(async () => {
    if (isExamMode || isPending || isRefreshingOnReturnRef.current) {
      return;
    }

    isRefreshingOnReturnRef.current = true;
    try {
      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      commitReturnedReviewState(nextState);
    } catch {
      toast.error("Could not refresh review progress. Please try again.");
    } finally {
      isRefreshingOnReturnRef.current = false;
    }
  });

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshReviewStateOnReturn();
      }
    }

    function handleWindowFocus() {
      void refreshReviewStateOnReturn();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  async function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    if (isExamMode) {
      examController.updateExamCard(updatedFlashcard);
      return;
    }

    if (deckId && updatedFlashcard.deckId !== deckId) {
      const nextState = await getFlashcardReviewState({
        deckId: selectedDeckId,
        limit: reviewBatchLimit,
      });

      commitReviewState(nextState);
      resetFocusViewState();
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    resetFocusViewState();
  }

  async function handleFlashcardDeleted(deletedId: string) {
    if (isExamMode) {
      examController.removeExamCard(deletedId);
      return;
    }

    const nextState = {
      ...reviewStateRef.current,
      cards: reviewStateRef.current.cards.filter(
        (card) => card.id !== deletedId,
      ),
      summary: {
        ...reviewStateRef.current.summary,
        dueCount: Math.max(0, reviewStateRef.current.summary.dueCount - 1),
        totalCount: Math.max(0, reviewStateRef.current.summary.totalCount - 1),
      },
    };

    commitReviewState(nextState);
    resetFocusViewState();

    if (shouldRefillFlashcardReviewState(nextState)) {
      void refillReviewState();
    }
  }

  function handleFlashcardReset(updatedFlashcard: FlashcardReviewEntity) {
    if (isExamMode) {
      examController.updateExamCard(updatedFlashcard);
      resetFocusViewState();
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    resetFocusViewState();
  }

  function handleGrade(grade: ReviewGrade) {
    if (isExamMode) {
      examController.handleGradeInExamMode(currentCard, grade);
      return;
    }

    if (!currentCard || isPending) {
      return;
    }

    setPendingGrade(grade);
    startActionTransition(async () => {
      try {
        const result = await reviewFlashcard({
          id: currentCard.id,
          grade,
          clientReviewId: crypto.randomUUID(),
        });

        if (!result.success) {
          toast.error(t(result.errorCode, result.errorParams));
          return;
        }

        const nextState = applyReviewedFlashcardToState(
          reviewStateRef.current,
          result.reviewedCardId,
          result.flashcard,
        );

        commitReviewState(nextState);
        resetFocusViewState();

        if (shouldRefillFlashcardReviewState(nextState)) {
          void refillReviewState();
        }
      } finally {
        setPendingGrade(null);
      }
    });
  }

  return {
    reviewState,
    selectedDeckId,
    examController,
    isExamMode,
    currentCard,
    isPending,
    pendingGrade,
    handleGrade,
    handleFlashcardUpdated,
    handleFlashcardDeleted,
    handleFlashcardReset,
  };
}
