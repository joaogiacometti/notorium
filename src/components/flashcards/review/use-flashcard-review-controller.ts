"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  reviewFlashcard,
  undoFlashcardReview,
} from "@/app/actions/flashcard-review";
import { useAppShellRefreshAfterReview } from "@/components/flashcards/review/use-app-shell-refresh-after-review";
import { useReviewStudyLater } from "@/components/flashcards/review/use-review-study-later";
import {
  applyReviewedFlashcardToState,
  excludeFlashcardsFromFetchedState,
  gradeFlashcardLocally,
  mergeFlashcardReviewStates,
  removeFlashcardsFromReviewState,
  replaceFlashcardInReviewState,
  restoreFlashcardToFront,
  shouldRefillFlashcardReviewState,
} from "@/features/flashcard-review/state";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import { fetchFlashcardReviewState } from "@/lib/read-api/flashcards";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  ReviewFlashcardResult,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

const reviewBatchLimit = 50;

interface UseFlashcardReviewControllerParams {
  initialState: FlashcardReviewState;
  subjectId?: string;
  resetCardViewState: () => void;
}

interface UndoableReview {
  cardId: string;
  reviewLogId: string;
}

/**
 * Owns the due-review session state machine: the working card batch,
 * optimistic apply on edit/delete/reset/study later, optimistic grading with
 * background saves, background refill, and undo.
 *
 * @example
 * const controller = useFlashcardReviewController({
 *   initialState,
 *   subjectId,
 *   resetCardViewState,
 * });
 */
export function useFlashcardReviewController({
  initialState,
  subjectId,
  resetCardViewState,
}: UseFlashcardReviewControllerParams) {
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [isUndoPending, setIsUndoPending] = useState(false);
  const isPending = isUndoPending;
  // Grades save in the background. In-flight saves are keyed by
  // clientReviewId; every graded card id is logged in order so a fetch can
  // tell which grades it may not reflect yet.
  const pendingSaveCardIdsRef = useRef(new Map<string, string>());
  const [pendingSaveCount, setPendingSaveCount] = useState(0);
  const gradedCardIdsRef = useRef<string[]>([]);
  const latestReviewIdByCardRef = useRef(new Map<string, string>());
  const refillRequestIdRef = useRef(0);
  const isRefillingRef = useRef(false);
  const [isRefilling, setIsRefilling] = useState(false);
  const undoingReviewIdRef = useRef<string | null>(null);
  const [undoableReview, setUndoableReview] = useState<UndoableReview | null>(
    null,
  );
  // Leaving the page cancels queued Server Action calls, so unsaved grades
  // would be lost silently; ask the browser to confirm first.
  useEffect(() => {
    if (pendingSaveCount === 0) {
      return;
    }

    function confirmLeaveWithUnsavedGrades(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", confirmLeaveWithUnsavedGrades);
    return () =>
      window.removeEventListener("beforeunload", confirmLeaveWithUnsavedGrades);
  }, [pendingSaveCount]);

  useAppShellRefreshAfterReview(pendingSaveCount + (isUndoPending ? 1 : 0));

  const currentCard = reviewState.cards[0] ?? null;
  const { toggleReviewCardStudyLater, pendingStudyLaterCount } =
    useReviewStudyLater({
      readReviewState: () => reviewStateRef.current,
      commitReturnedReviewState,
    });

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
  }

  function commitReturnedReviewState(nextState: FlashcardReviewState) {
    const currentCardId = reviewStateRef.current.cards[0]?.id;
    const nextCardId = nextState.cards[0]?.id;

    commitReviewState(nextState);

    if (currentCardId !== nextCardId) {
      resetCardViewState();
    }
  }

  // Single entry point for review-state reads. Cards graded after the read
  // started, or still saving when it started, may come back as due; drop them.
  async function fetchReviewStateWithoutUnsavedGrades(): Promise<FlashcardReviewState> {
    const gradedCountAtStart = gradedCardIdsRef.current.length;
    const savingIdsAtStart = [...pendingSaveCardIdsRef.current.values()];
    const fetchedState = await fetchFlashcardReviewState({
      subjectId,
      limit: reviewBatchLimit,
    });
    const unsavedIds = new Set([
      ...savingIdsAtStart,
      ...gradedCardIdsRef.current.slice(gradedCountAtStart),
    ]);

    return excludeFlashcardsFromFetchedState(fetchedState, unsavedIds);
  }

  async function refillReviewState(retryCount = 0) {
    if (isRefillingRef.current) {
      return;
    }
    isRefillingRef.current = true;
    setIsRefilling(true);

    try {
      const requestId = refillRequestIdRef.current + 1;
      refillRequestIdRef.current = requestId;

      const nextState = await fetchReviewStateWithoutUnsavedGrades();

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
    } catch {
      // The finally block retries while the queue still needs cards; only
      // report once the last retry has failed.
      if (retryCount >= 3) {
        toast.error("Could not load more cards. Please try again.");
      }
    } finally {
      isRefillingRef.current = false;
      setIsRefilling(false);
      if (
        shouldRefillFlashcardReviewState(reviewStateRef.current) &&
        retryCount < 3
      ) {
        void refillReviewState(retryCount + 1);
      }
    }
  }

  async function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    if (subjectId && updatedFlashcard.subjectId !== subjectId) {
      // The card moved out of this session's scope; if the scope cannot be
      // re-read, drop it locally instead of leaving it as the current card.
      const nextState = await fetchReviewStateWithoutUnsavedGrades().catch(() =>
        removeFlashcardsFromReviewState(reviewStateRef.current, [
          updatedFlashcard.id,
        ]),
      );

      commitReviewState(nextState);
      resetCardViewState();
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    resetCardViewState();
  }

  async function handleFlashcardDeleted(deletedId: string) {
    try {
      const nextState = await fetchReviewStateWithoutUnsavedGrades();
      commitReviewState(nextState);
    } catch {
      commitReviewState(
        removeFlashcardsFromReviewState(reviewStateRef.current, [deletedId]),
      );
      toast.error("Review counts could not be refreshed.");
    }
    resetCardViewState();
  }

  function handleFlashcardReset(updatedFlashcard: FlashcardReviewEntity) {
    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    resetCardViewState();
  }

  function handleToggleStudyLater() {
    if (!currentCard || isPending) {
      return;
    }

    toggleReviewCardStudyLater(currentCard);
  }

  function handleGrade(grade: ReviewGrade) {
    if (!currentCard || isPending) {
      return;
    }

    // Advance immediately from the locally scheduled card; the server result
    // replaces it once the background save lands.
    const reviewedAt = new Date();
    const nextState = applyReviewedFlashcardToState(
      reviewStateRef.current,
      currentCard.id,
      gradeFlashcardLocally(
        currentCard,
        grade,
        reviewStateRef.current.scheduler,
        reviewedAt,
      ),
      reviewedAt,
    );

    commitReviewState(nextState);
    resetCardViewState();
    void saveGrade(currentCard, grade);

    if (shouldRefillFlashcardReviewState(nextState)) {
      void refillReviewState();
    }
  }

  async function saveGrade(
    gradedCard: FlashcardReviewEntity,
    grade: ReviewGrade,
  ) {
    const clientReviewId = crypto.randomUUID();
    trackPendingSave(gradedCard.id, clientReviewId);

    // Server Actions run one at a time per client, so background saves still
    // reach the server in grading order.
    try {
      const result = await reviewFlashcard({
        id: gradedCard.id,
        grade,
        clientReviewId,
      });
      applySavedGrade(gradedCard, clientReviewId, result);
    } catch {
      applySavedGrade(gradedCard, clientReviewId, null);
    } finally {
      pendingSaveCardIdsRef.current.delete(clientReviewId);
      setPendingSaveCount((count) => count - 1);
      refillAfterSavesLand();
    }
  }

  // A refill fetched while grades were still saving drops those cards, so the
  // batch can come back without new ones. Once every save has landed the
  // server's batch is current; fetch again if the queue still runs short.
  function refillAfterSavesLand() {
    if (
      pendingSaveCardIdsRef.current.size === 0 &&
      shouldRefillFlashcardReviewState(reviewStateRef.current)
    ) {
      void refillReviewState();
    }
  }

  function trackPendingSave(cardId: string, clientReviewId: string) {
    pendingSaveCardIdsRef.current.set(clientReviewId, cardId);
    gradedCardIdsRef.current.push(cardId);
    latestReviewIdByCardRef.current.set(cardId, clientReviewId);
    setPendingSaveCount((count) => count + 1);
  }

  function applySavedGrade(
    gradedCard: FlashcardReviewEntity,
    clientReviewId: string,
    result: ReviewFlashcardResult | null,
  ) {
    // A later grade of the same card supersedes this one's outcome.
    if (latestReviewIdByCardRef.current.get(gradedCard.id) !== clientReviewId) {
      return;
    }

    if (!result?.success) {
      toast.error(
        result
          ? t(result.errorCode, result.errorParams)
          : "Could not save the review. Please try again.",
      );
      commitReturnedReviewState(
        restoreFlashcardToFront(reviewStateRef.current, gradedCard),
      );
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, {
        ...result.flashcard,
        subjectName: gradedCard.subjectName,
        subjectPath: gradedCard.subjectPath,
      }),
    );
    setUndoableReview({
      cardId: result.reviewedCardId,
      reviewLogId: result.reviewLogId,
    });
  }

  async function handleUndoReview() {
    if (!undoableReview) {
      return;
    }

    const { cardId, reviewLogId } = undoableReview;
    if (undoingReviewIdRef.current === reviewLogId) {
      return;
    }

    undoingReviewIdRef.current = reviewLogId;
    setIsUndoPending(true);

    try {
      const result = await undoFlashcardReview({
        id: cardId,
        reviewLogId,
      });

      if (!result.success) {
        setUndoableReview(null);
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      refillRequestIdRef.current += 1;
      const nextState = await fetchReviewStateWithoutUnsavedGrades();
      commitReviewState(nextState);
      resetCardViewState();
      setUndoableReview(null);
    } catch {
      toast.error("Could not undo the review. Please try again.");
    } finally {
      undoingReviewIdRef.current = null;
      setIsUndoPending(false);
    }
  }

  return {
    reviewState,
    currentCard,
    isPending,
    hasPendingWrites:
      pendingSaveCount > 0 || pendingStudyLaterCount > 0 || isUndoPending,
    canUndoReview: undoableReview !== null && pendingSaveCount === 0,
    // More cards are due than are queued and a refill or save is still in
    // flight, so an empty queue does not mean the session is done.
    isLoadingMoreCards:
      reviewState.cards.length === 0 &&
      reviewState.summary.dueCount > 0 &&
      (isRefilling || pendingSaveCount > 0),
    handleGrade,
    handleToggleStudyLater,
    handleUndoReview,
    handleFlashcardUpdated,
    handleFlashcardDeleted,
    handleFlashcardReset,
  };
}
