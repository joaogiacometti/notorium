"use client";

import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewSessionDialogsProps {
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
}

/**
 * Edit, delete, and reset dialogs for the card shown in a review or exam
 * session.
 *
 * @example
 * <ReviewSessionDialogs currentCard={card} aiEnabled editOpen={false} deleteOpen={false} resetOpen={false} ... />
 */
export function ReviewSessionDialogs({
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
}: Readonly<ReviewSessionDialogsProps>) {
  if (!currentCard) {
    return null;
  }

  return (
    <>
      <EditFlashcardDialog
        key={currentCard.id}
        flashcard={currentCard}
        open={editOpen}
        onOpenChange={onEditOpenChange}
        aiEnabled={aiEnabled}
        onUpdated={onUpdated}
      />
      <DeleteFlashcardDialog
        flashcardId={currentCard.id}
        flashcardFront={currentCard.front}
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        onDeleted={onDeleted}
      />
      <ResetFlashcardDialog
        flashcardId={currentCard.id}
        flashcardFront={currentCard.front}
        open={resetOpen}
        onOpenChange={onResetOpenChange}
        onReset={onReset}
      />
    </>
  );
}
