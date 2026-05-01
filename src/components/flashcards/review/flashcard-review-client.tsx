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
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ExamExitConfirmationDialog } from "@/components/flashcards/review/exam-exit-confirmation-dialog";
import { ExamResultsScreen } from "@/components/flashcards/review/exam-results-screen";
import { ReturnSyncBlockingOverlay } from "@/components/flashcards/review/return-sync-blocking-overlay";
import { FocusModeOverlay } from "@/components/flashcards/review/review-focus-mode-overlay";
import { ReviewHubView } from "@/components/flashcards/review/review-hub-view";
import { useFlashcardExamController } from "@/components/flashcards/review/use-flashcard-exam-controller";
import { useFlashcardReviewSync } from "@/components/flashcards/review/use-flashcard-review-sync";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { applyOfflineFlashcardReview } from "@/features/flashcard-review/offline-review";
import {
  getFlashcardReviewScopeKey,
  queueOfflineReviewEvent,
  saveOfflineReviewState,
} from "@/features/flashcard-review/offline-store";
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
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null);
  const [isActionPending, startActionTransition] = useTransition();
  const isPending = isActionPending;
  const refillRequestIdRef = useRef(0);
  const isRefillingRef = useRef(false);
  const [selectedDeckId, setSelectedDeckId] = useState(deckId);

  useEffect(() => {
    setSelectedDeckId(deckId);
  }, [deckId]);
  const reviewScopeKey = getFlashcardReviewScopeKey(selectedDeckId);

  function commitReviewState(nextState: FlashcardReviewState) {
    reviewStateRef.current = nextState;
    setReviewState(nextState);
    void saveOfflineReviewState(reviewScopeKey, nextState).catch(() => {});
  }

  function resetFocusViewState() {
    setRevealed(false);
    setEditOpen(false);
    setDeleteOpen(false);
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
  const {
    isOnline,
    isReturnSyncBlocking,
    markOfflineReviewQueued,
    pendingSyncCount,
    syncStatus,
  } = useFlashcardReviewSync({
    selectedDeckId,
    reviewBatchLimit,
    isExamMode,
    isPending,
    commitReturnedReviewState,
    commitStoredReviewState: commitReviewState,
    getCurrentReviewState: () => reviewStateRef.current,
  });

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

  async function refillReviewState(retryCount = 0) {
    if (isRefillingRef.current || !isOnline) {
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

  function handleGrade(grade: ReviewGrade) {
    if (isExamMode) {
      handleGradeInExamMode(currentCard, grade);
      return;
    }

    if (!currentCard || isPending) {
      return;
    }

    if (!isOnline) {
      void handleOfflineGrade(currentCard, grade);
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

  async function handleOfflineGrade(
    card: FlashcardReviewEntity,
    grade: ReviewGrade,
  ) {
    const reviewedAt = new Date();
    const clientReviewId = crypto.randomUUID();
    const nextState = applyOfflineFlashcardReview({
      state: reviewStateRef.current,
      card,
      grade,
      reviewedAt,
    });

    commitReviewState(nextState);
    resetFocusViewState();
    markOfflineReviewQueued();

    await queueOfflineReviewEvent({
      clientReviewId,
      flashcardId: card.id,
      grade,
      reviewedAt,
    });
  }

  const handleReviewKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shortcutsSuspended) {
      return;
    }

    if (isFocusMode && event.key === "Escape") {
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
      isDialogOpen: editOpen || deleteOpen,
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

    handleGrade(action.grade);
  });

  useEffect(() => {
    document.addEventListener("keydown", handleReviewKeyDown);

    return () => document.removeEventListener("keydown", handleReviewKeyDown);
  }, []);

  const isReviewActionBlocked = isPending || isReturnSyncBlocking;
  const content = (
    <div className="relative min-h-0">
      <ReviewHubView
        hasDueCards={hasDueCards}
        dueBadgeText={dueBadgeText}
        hasExamCards={hasExamCards}
        examBadgeText={examBadgeText}
        examScopeLabel={examScopeLabel}
        isLoadingExamCards={isLoadingExamCards}
        isPending={isReviewActionBlocked}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        isOnline={isOnline}
        onStartReview={handleStartReviewMode}
        onStartExam={handleStartExamMode}
      />
      {isReturnSyncBlocking ? <ReturnSyncBlockingOverlay /> : null}
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
          isPending={isReviewActionBlocked}
          pendingGrade={pendingGrade}
          syncStatus={syncStatus}
          pendingSyncCount={pendingSyncCount}
          previewLabels={previewLabels}
          onReveal={() => setRevealed(true)}
          onGrade={handleGrade}
          onExitFocusMode={
            isExamMode ? handleExitExamMode : () => setIsFocusMode(false)
          }
          isExamMode={isExamMode}
          examCurrentIndex={examSessionData?.currentIndex ?? 0}
          examTotalCards={examSessionData?.cards.length ?? 0}
        />
        {isReturnSyncBlocking ? (
          <ReturnSyncBlockingOverlay placement="fixed" />
        ) : null}
        {currentCard ? (
          <>
            <EditFlashcardDialog
              key={currentCard.id}
              flashcard={currentCard}
              open={editOpen}
              onOpenChange={setEditOpen}
              aiEnabled={aiEnabled}
              onUpdated={handleFlashcardUpdated}
              onDeleted={handleFlashcardDeleted}
              className="z-120"
              overlayClassName="z-120"
            />
            <DeleteFlashcardDialog
              flashcardId={currentCard.id}
              flashcardFront={currentCard.front}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              onDeleted={handleFlashcardDeleted}
              className="z-120"
              overlayClassName="z-120"
            />
          </>
        ) : null}
        {examSession.sessionComplete && examSessionData ? (
          <ExamResultsScreen
            totalCards={examSessionData.cards.length}
            ratings={examSessionData.ratings}
            duration={Math.floor(
              (Date.now() - examSessionData.startedAt.getTime()) / 1000,
            )}
            onClose={handleCloseResults}
            onRetryWeak={handleRetryWeakCards}
          />
        ) : null}
        <ExamExitConfirmationDialog
          open={showExitConfirmation}
          onOpenChange={examController.setShowExitConfirmation}
          onConfirm={handleConfirmExitExam}
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
