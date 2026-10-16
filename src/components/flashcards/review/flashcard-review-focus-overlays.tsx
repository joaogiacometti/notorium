"use client";

import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { ExamExitConfirmationDialog } from "@/components/flashcards/review/exam-exit-confirmation-dialog";
import { ExamResultsScreen } from "@/components/flashcards/review/exam-results-screen";
import type { ReviewGrade } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ExamResultsData {
  cards: FlashcardReviewEntity[];
  ratings: ReviewGrade[];
  startedAt: Date;
}

interface FlashcardReviewFocusOverlaysProps {
  currentCard: ReviewCard | null;
  aiEnabled: boolean;
  editOpen: boolean;
  deleteOpen: boolean;
  resetOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  onDeleteOpenChange: (open: boolean) => void;
  onResetOpenChange: (open: boolean) => void;
  onUpdated: (card: ReviewCard) => void | Promise<void>;
  onDeleted: (deletedId: string) => void | Promise<void>;
  onReset: (updated: FlashcardReviewEntity) => void;
  examSessionComplete: boolean;
  examResultsData: ExamResultsData | null;
  onCloseResults: () => void;
  onRetryWeakCards: () => void;
  showExitConfirmation: boolean;
  onShowExitConfirmationChange: (open: boolean) => void;
  onConfirmExitExam: () => void;
}

export function FlashcardReviewFocusOverlays({
  currentCard,
  aiEnabled,
  editOpen,
  deleteOpen,
  resetOpen,
  onEditOpenChange,
  onDeleteOpenChange,
  onResetOpenChange,
  onUpdated,
  onDeleted,
  onReset,
  examSessionComplete,
  examResultsData,
  onCloseResults,
  onRetryWeakCards,
  showExitConfirmation,
  onShowExitConfirmationChange,
  onConfirmExitExam,
}: Readonly<FlashcardReviewFocusOverlaysProps>) {
  return (
    <>
      {currentCard ? (
        <>
          <EditFlashcardDialog
            key={currentCard.id}
            flashcard={currentCard}
            open={editOpen}
            onOpenChange={onEditOpenChange}
            aiEnabled={aiEnabled}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            className="z-120"
            overlayClassName="z-120"
          />
          <DeleteFlashcardDialog
            flashcardId={currentCard.id}
            flashcardFront={currentCard.front}
            open={deleteOpen}
            onOpenChange={onDeleteOpenChange}
            onDeleted={onDeleted}
            className="z-120"
            overlayClassName="z-120"
          />
          <ResetFlashcardDialog
            flashcardId={currentCard.id}
            flashcardFront={currentCard.front}
            open={resetOpen}
            onOpenChange={onResetOpenChange}
            onReset={onReset}
            className="z-120"
            overlayClassName="z-120"
          />
        </>
      ) : null}
      {examSessionComplete && examResultsData ? (
        <ExamResultsScreen
          totalCards={examResultsData.cards.length}
          ratings={examResultsData.ratings}
          duration={Math.floor(
            (Date.now() - examResultsData.startedAt.getTime()) / 1000,
          )}
          onClose={onCloseResults}
          onRetryWeak={onRetryWeakCards}
        />
      ) : null}
      <ExamExitConfirmationDialog
        open={showExitConfirmation}
        onOpenChange={onShowExitConfirmationChange}
        onConfirm={onConfirmExitExam}
      />
    </>
  );
}
