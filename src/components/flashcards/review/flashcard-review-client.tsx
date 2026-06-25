"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FlashcardReviewFocusOverlays } from "@/components/flashcards/review/flashcard-review-focus-overlays";
import { FocusModeOverlay } from "@/components/flashcards/review/review-focus-mode-overlay";
import { ReviewHubView } from "@/components/flashcards/review/review-hub-view";
import { useFlashcardReviewController } from "@/components/flashcards/review/use-flashcard-review-controller";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { getFlashcardReviewPreviewLabels } from "@/features/flashcard-review/preview";
import { useFlashcardReviewShortcuts } from "@/features/flashcard-review/shortcuts";
import type {
  FlashcardReviewState,
  SubjectEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";

interface FlashcardReviewClientProps {
  initialState: FlashcardReviewState;
  subjects: Array<SubjectEntity | SubjectOption>;
  subjectId?: string;
  /**
   * When true, jump straight into the full-screen focus session on mount
   * instead of showing the review hub. Only honored when cards are due.
   */
  autoStartReview?: boolean;
  embedded?: boolean;
  aiEnabled: boolean;
}

export function FlashcardReviewClient({
  initialState,
  subjects,
  subjectId,
  autoStartReview = false,
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
    subjectId,
    isFocusMode,
    resetFocusViewState,
    setFocusMode: setIsFocusMode,
  });
  const {
    reviewState,
    selectedSubjectId,
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
  const examScopeLabel = selectedSubjectId
    ? "All cards in subject"
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

  useFlashcardReviewShortcuts({
    shortcutsSuspended,
    isFocusMode,
    isExamMode,
    revealed,
    hasCurrentCard: currentCard !== null,
    isPending,
    isDialogOpen: editOpen || deleteOpen || resetOpen,
    onReveal: () => setRevealed(true),
    onEdit: () => setEditOpen(true),
    onDelete: () => setDeleteOpen(true),
    onReset: () => setResetOpen(true),
    onGrade: handleGrade,
    onExitExamMode: handleExitExamMode,
    onExitFocusMode: () => setIsFocusMode(false),
  });

  // Honor a deep link (e.g. the sidebar "Review flashcards" action) that asks to
  // open the full-screen focus session directly. Only when cards are due, and
  // only once so exiting focus mode returns to the hub instead of re-triggering.
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (hasAutoStartedRef.current || !autoStartReview || !hasDueCards) {
      return;
    }
    hasAutoStartedRef.current = true;
    handleStartReviewMode();
  }, [autoStartReview, hasDueCards, handleStartReviewMode]);

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
          subjects={subjects}
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
              subjectName: currentCard.subjectName,
              subjectPath: currentCard.subjectPath,
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
