"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { FlashcardReviewFocusOverlays } from "@/components/flashcards/review/flashcard-review-focus-overlays";
import { FocusModeOverlay } from "@/components/flashcards/review/review-focus-mode-overlay";
import { ReviewHubView } from "@/components/flashcards/review/review-hub-view";
import { useFlashcardReviewController } from "@/components/flashcards/review/use-flashcard-review-controller";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import {
  getFlashcardReviewShortcutAction,
  isEditableFlashcardReviewKeyboardTarget,
} from "@/features/flashcard-review/shortcuts";
import type {
  DeckEntity,
  DeckOption,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  decks: Array<DeckEntity | DeckOption>;
  deckId?: string;
  embedded?: boolean;
  aiEnabled: boolean;
}

export function FlashcardReviewClient({
  initialState,
  decks,
  deckId,
  embedded = false,
  aiEnabled,
}: Readonly<FlashcardReviewClientProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [revealed, setRevealed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  function resetFocusViewState() {
    setRevealed(false);
    setEditOpen(false);
    setDeleteOpen(false);
    setResetOpen(false);
  }

  const controller = useFlashcardReviewController({
    initialState,
    deckId,
    resetFocusViewState,
    setFocusMode: setIsFocusMode,
  });
  const {
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
  } = controller;
  const {
    examSession,
    examSessionData,
    handleCloseResults,
    handleConfirmExitExam,
    handleExitExamMode,
    handleRetryWeakCards,
    handleStartExamMode,
    handleStartReviewMode,
    isLoadingExamCards,
    progress: examProgress,
    showExitConfirmation,
  } = examController;

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
