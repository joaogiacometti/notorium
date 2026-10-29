"use client";

import { useRouter } from "next/navigation";
import { ExamExitConfirmationDialog } from "@/components/flashcards/review/exam-exit-confirmation-dialog";
import { ExamResultsScreen } from "@/components/flashcards/review/exam-results-screen";
import { ReviewSessionDialogs } from "@/components/flashcards/review/review-session-dialogs";
import { ReviewSessionScreen } from "@/components/flashcards/review/review-session-screen";
import { useFlashcardExamController } from "@/components/flashcards/review/use-flashcard-exam-controller";
import { useSessionCardView } from "@/components/flashcards/review/use-session-card-view";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { useFlashcardReviewShortcuts } from "@/features/flashcard-review/shortcuts";
import { getFlashcardsHref } from "@/lib/navigation/detail-page-back-link";
import type {
  FlashcardReviewEntity,
  SubjectEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";

interface FlashcardExamSessionProps {
  initialCards: FlashcardReviewEntity[];
  subjects: Array<SubjectEntity | SubjectOption>;
  subjectId?: string;
  aiEnabled: boolean;
}

/**
 * Exam session page: practice over every card in scope without changing
 * review scheduling. Progress lives only in client state, so a reload starts
 * a fresh exam.
 *
 * @example
 * <FlashcardExamSession initialCards={cards} subjects={subjects} aiEnabled={false} />
 */
export function FlashcardExamSession({
  initialCards,
  subjects,
  subjectId,
  aiEnabled,
}: Readonly<FlashcardExamSessionProps>) {
  const router = useRouter();
  const shortcutsSuspended = useShortcutsDialogOpen();
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

  const exam = useFlashcardExamController({
    initialCards,
    resetCardViewState,
    onExit: () => router.push(getFlashcardsHref("review", subjectId)),
  });
  const { currentCard, session } = exam;

  useFlashcardReviewShortcuts({
    shortcutsSuspended,
    revealed,
    hasCurrentCard: currentCard !== null,
    canUndoReview: false,
    isPending: false,
    isDialogOpen,
    onReveal: () => setRevealed(true),
    onEdit: () => setEditing(true),
    onDelete: () => setDeleteOpen(true),
    onReset: () => setResetOpen(true),
    onUndo: () => {},
    onGrade: exam.handleGrade,
    onExit: exam.handleExit,
  });

  if (session && exam.sessionComplete) {
    return (
      <ExamResultsScreen
        totalCards={session.cards.length}
        ratings={session.ratings}
        duration={Math.floor((Date.now() - session.startedAt.getTime()) / 1000)}
        onClose={exam.handleExit}
        onRetryWeak={exam.handleRetryWeakCards}
      />
    );
  }

  return (
    <>
      <ReviewSessionScreen
        isExamMode
        currentCard={currentCard}
        headerText={`Card ${(session?.currentIndex ?? 0) + 1} of ${session?.cards.length ?? 0}`}
        subjects={subjects}
        progress={exam.progress}
        revealed={revealed}
        isPending={false}
        onReveal={() => setRevealed(true)}
        onGrade={exam.handleGrade}
        canUndoReview={false}
        onUndoReview={() => {}}
        onExit={exam.handleExit}
        onEditFlashcard={() => setEditing(true)}
        editing={editing}
        aiEnabled={aiEnabled}
        onStopEditing={() => setEditing(false)}
        onFlashcardUpdated={exam.updateExamCard}
        onResetFlashcard={() => setResetOpen(true)}
        onDeleteFlashcard={() => setDeleteOpen(true)}
      />
      <ReviewSessionDialogs
        currentCard={currentCard}
        deleteOpen={deleteOpen}
        resetOpen={resetOpen}
        onDeleteOpenChange={setDeleteOpen}
        onResetOpenChange={setResetOpen}
        onDeleted={exam.removeExamCard}
        onReset={exam.updateExamCard}
      />
      <ExamExitConfirmationDialog
        open={exam.showExitConfirmation}
        onOpenChange={exam.setShowExitConfirmation}
        onConfirm={exam.handleConfirmExit}
      />
    </>
  );
}
