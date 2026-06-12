"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  getFlashcardReviewState,
  reviewFlashcard,
} from "@/app/actions/flashcard-review";
import { FlashcardReviewFocusOverlays } from "@/components/flashcards/review/flashcard-review-focus-overlays";
import { FocusModeOverlay } from "@/components/flashcards/review/review-focus-mode-overlay";
import { ReviewHubView } from "@/components/flashcards/review/review-hub-view";
import { useFlashcardExamController } from "@/components/flashcards/review/use-flashcard-exam-controller";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import {
  getFlashcardReviewShortcutAction,
  isEditableFlashcardReviewKeyboardTarget,
} from "@/features/flashcard-review/shortcuts";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  replaceFlashcardInReviewState,
  shouldRefillFlashcardReviewState,
} from "@/features/flashcard-review/state";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  DeckEntity,
  DeckOption,
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  decks: Array<DeckEntity | DeckOption>;
  deckId?: string;
  embedded?: boolean;
  aiEnabled: boolean;
}

const reviewBatchLimit = 50;

export function FlashcardReviewClient({
  initialState,
  decks,
  deckId,
  embedded = false,
  aiEnabled,
}: Readonly<FlashcardReviewClientProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [reviewState, setReviewState] = useState(initialState);
  const reviewStateRef = useRef(initialState);
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
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

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
  }

  function resetFocusViewState() {
    setRevealed(false);
    setEditOpen(false);
    setDeleteOpen(false);
    setResetOpen(false);
  }

  function commitReturnedReviewState(nextState: FlashcardReviewState) {
    const currentCardId = reviewStateRef.current.cards[0]?.id;
    const nextCardId = nextState.cards[0]?.id;

    commitReviewState(nextState);

    if (currentCardId !== nextCardId) {
      resetFocusViewState();
    }
  }

  const examController = useFlashcardExamController({
    selectedDeckId,
    isPending,
    resetFocusViewState,
    setFocusMode: setIsFocusMode,
  });
  const {
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
    progress: examProgress,
    removeExamCard,
    showExitConfirmation,
    updateExamCard,
  } = examController;
  const currentCard = isExamMode
    ? examController.currentCard
    : (reviewState.cards[0] ?? null);
  const hasDueCards = reviewState.summary.dueCount > 0;
  const hasExamCards = reviewState.summary.totalCount > 0;
  const dueBadgeText = `${reviewState.summary.dueCount} due`;
  const examBadgeText = `${reviewState.summary.totalCount} ${
    reviewState.summary.totalCount === 1 ? "card" : "cards"
  }`;
  const examScopeLabel = selectedDeckId
    ? "All cards in deck"
    : "All flashcards";

  const progress = isExamMode
    ? examProgress
    : reviewState.summary.totalCount > 0
      ? (reviewState.summary.totalCount - reviewState.summary.dueCount) /
        reviewState.summary.totalCount
      : 0;
  const previewLabels = useMemo(
    () =>
      currentCard
        ? getFlashcardReviewPreviewLabels({
            card: currentCard,
            scheduler: reviewState.scheduler,
          })
        : null,
    [currentCard, reviewState.scheduler],
  );

  async function handleFlashcardUpdated(
    updatedFlashcard: FlashcardReviewState["cards"][number],
  ) {
    if (isExamMode) {
      updateExamCard(updatedFlashcard);
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
      removeExamCard(deletedId);
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
      updateExamCard(updatedFlashcard);
      resetFocusViewState();
      return;
    }

    commitReviewState(
      replaceFlashcardInReviewState(reviewStateRef.current, updatedFlashcard),
    );
    resetFocusViewState();
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

  function handleGrade(grade: ReviewGrade) {
    if (isExamMode) {
      handleGradeInExamMode(currentCard, grade);
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

  const handleReviewKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shortcutsSuspended) {
      return;
    }

    if (isFocusMode && event.key === "Escape") {
      // Let an open dialog own Escape so unsaved-changes confirmation can
      // appear instead of unmounting the whole focus view.
      if (editOpen || deleteOpen || resetOpen) {
        return;
      }
      event.preventDefault();
      if (isExamMode) {
        handleExitExamMode();
      } else {
        setIsFocusMode(false);
      }
      return;
    }

    if (!isFocusMode) {
      return;
    }

    const action = getFlashcardReviewShortcutAction({
      key: event.key,
      revealed,
      hasCurrentCard: currentCard !== null,
      isPending,
      isDialogOpen: editOpen || deleteOpen || resetOpen,
      isEditableTarget: isEditableFlashcardReviewKeyboardTarget(event.target),
      hasModifierKey: event.altKey || event.ctrlKey || event.metaKey,
      isRepeat: event.repeat,
    });

    if (!action) {
      return;
    }

    event.preventDefault();

    if (action.type === "reveal") {
      setRevealed(true);
      return;
    }

    if (action.type === "edit") {
      setEditOpen(true);
      return;
    }

    if (action.type === "delete") {
      setDeleteOpen(true);
      return;
    }

    if (action.type === "reset") {
      setResetOpen(true);
      return;
    }

    handleGrade(action.grade);
  });

  useEffect(() => {
    document.addEventListener("keydown", handleReviewKeyDown);

    return () => document.removeEventListener("keydown", handleReviewKeyDown);
  }, []);

  const content = (
    <div className="relative min-h-0">
      <ReviewHubView
        hasDueCards={hasDueCards}
        dueBadgeText={dueBadgeText}
        hasExamCards={hasExamCards}
        examBadgeText={examBadgeText}
        examScopeLabel={examScopeLabel}
        isLoadingExamCards={isLoadingExamCards}
        isPending={isPending}
        onStartReview={handleStartReviewMode}
        onStartExam={handleStartExamMode}
      />
    </div>
  );

  if (isFocusMode) {
    return (
      <>
        <FocusModeOverlay
          currentCard={currentCard}
          reviewState={reviewState}
          decks={decks}
          progress={progress}
          revealed={revealed}
          isPending={isPending}
          pendingGrade={pendingGrade}
          previewLabels={previewLabels}
          onReveal={() => setRevealed(true)}
          onGrade={handleGrade}
          onExitFocusMode={
            isExamMode ? handleExitExamMode : () => setIsFocusMode(false)
          }
          onEditFlashcard={() => setEditOpen(true)}
          onResetFlashcard={() => setResetOpen(true)}
          onDeleteFlashcard={() => setDeleteOpen(true)}
          isExamMode={isExamMode}
          examCurrentIndex={examSessionData?.currentIndex ?? 0}
          examTotalCards={examSessionData?.cards.length ?? 0}
        />
        <FlashcardReviewFocusOverlays
          currentCard={currentCard}
          aiEnabled={aiEnabled}
          editOpen={editOpen}
          deleteOpen={deleteOpen}
          resetOpen={resetOpen}
          onEditOpenChange={setEditOpen}
          onDeleteOpenChange={setDeleteOpen}
          onResetOpenChange={setResetOpen}
          onUpdated={handleFlashcardUpdated}
          onDeleted={handleFlashcardDeleted}
          onReset={(updated) => {
            if (!currentCard) return;
            handleFlashcardReset({
              ...updated,
              deckName: currentCard.deckName,
              deckPath: currentCard.deckPath,
            });
          }}
          examSessionComplete={examSession.sessionComplete}
          examResultsData={examSessionData}
          onCloseResults={handleCloseResults}
          onRetryWeakCards={handleRetryWeakCards}
          showExitConfirmation={showExitConfirmation}
          onShowExitConfirmationChange={examController.setShowExitConfirmation}
          onConfirmExitExam={handleConfirmExitExam}
        />
      </>
    );
  }

  return embedded ? (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
      {content}
    </div>
  ) : (
    <AppPageContainer>{content}</AppPageContainer>
  );
}
