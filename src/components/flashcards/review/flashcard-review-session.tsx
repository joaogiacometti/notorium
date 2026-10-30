"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ReviewSessionDialogs } from "@/components/flashcards/review/review-session-dialogs";
import { ReviewSessionScreen } from "@/components/flashcards/review/review-session-screen";
import { useFlashcardReviewController } from "@/components/flashcards/review/use-flashcard-review-controller";
import { useSessionCardView } from "@/components/flashcards/review/use-session-card-view";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { useFlashcardReviewShortcuts } from "@/features/flashcard-review/shortcuts";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";
import type {
  FlashcardReviewState,
  SubjectEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";

interface FlashcardReviewSessionProps {
  initialState: FlashcardReviewState;
  subjects: Array<SubjectEntity | SubjectOption>;
  subjectId?: string;
  aiEnabled: boolean;
}

/**
 * Due-card review session page. Exiting waits for in-flight grade saves so the
 * hub it returns to reflects every grade.
 *
 * @example
 * <FlashcardReviewSession initialState={state} subjects={subjects} aiEnabled={false} />
 */
export function FlashcardReviewSession({
  initialState,
  subjects,
  subjectId,
  aiEnabled,
}: Readonly<FlashcardReviewSessionProps>) {
  const router = useRouter();
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [exitRequested, setExitRequested] = useState(false);
  const {
    revealed,
    setRevealed,
    editing,
    setEditing,
    deleteOpen,
    setDeleteOpen,
    resetOpen,
    setResetOpen,
    isDialogOpen,
    resetCardViewState,
  } = useSessionCardView();

  const controller = useFlashcardReviewController({
    initialState,
    subjectId,
    resetCardViewState,
  });
  const { reviewState, currentCard, hasPendingWrites } = controller;
  const { dueCount, totalCount } = reviewState.summary;

  useEffect(() => {
    if (exitRequested && !hasPendingWrites) {
      router.push(getFlashcardsHref("review", subjectId));
    }
  }, [exitRequested, hasPendingWrites, router, subjectId]);

  const isPending = controller.isPending || exitRequested;
  useFlashcardReviewShortcuts({
    shortcutsSuspended,
    revealed,
    hasCurrentCard: currentCard !== null,
    canUndoReview: controller.canUndoReview,
    isPending,
    isDialogOpen,
    onReveal: () => setRevealed(true),
    onEdit: () => setEditing(true),
    onDelete: () => setDeleteOpen(true),
    onReset: () => setResetOpen(true),
    onUndo: controller.handleUndoReview,
    onToggleStudyLater: controller.handleToggleStudyLater,
    onGrade: controller.handleGrade,
    onExit: () => setExitRequested(true),
  });

  return (
    <>
      <ReviewSessionScreen
        currentCard={currentCard}
        headerText={getDueReviewHeaderText(dueCount, totalCount)}
        subjects={subjects}
        progress={totalCount > 0 ? (totalCount - dueCount) / totalCount : 0}
        revealed={revealed}
        isPending={isPending}
        onReveal={() => setRevealed(true)}
        onGrade={controller.handleGrade}
        canUndoReview={controller.canUndoReview}
        isLoadingMoreCards={controller.isLoadingMoreCards}
        onUndoReview={controller.handleUndoReview}
        onExit={() => setExitRequested(true)}
        onEditFlashcard={() => setEditing(true)}
        editing={editing}
        aiEnabled={aiEnabled}
        onStopEditing={() => setEditing(false)}
        onFlashcardUpdated={controller.handleFlashcardUpdated}
        onResetFlashcard={() => setResetOpen(true)}
        onDeleteFlashcard={() => setDeleteOpen(true)}
        onToggleStudyLater={controller.handleToggleStudyLater}
      />
      <ReviewSessionDialogs
        currentCard={currentCard}
        deleteOpen={deleteOpen}
        resetOpen={resetOpen}
        onDeleteOpenChange={setDeleteOpen}
        onResetOpenChange={setResetOpen}
        onDeleted={controller.handleFlashcardDeleted}
        onReset={(updated) => {
          if (!currentCard) return;
          controller.handleFlashcardReset({
            ...updated,
            subjectName: currentCard.subjectName,
            subjectPath: currentCard.subjectPath,
          });
        }}
      />
    </>
  );
}

function getDueReviewHeaderText(dueCount: number, totalCount: number) {
  if (dueCount === 0) {
    return "No cards due right now";
  }

  return `${dueCount} due of ${totalCount} total cards`;
}
