"use client";

import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewSessionDialogsProps {
  currentCard: ReviewCard | null;
  deleteOpen: boolean;
  resetOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onResetOpenChange: (open: boolean) => void;
  onDeleted: (deletedId: string) => void | Promise<void>;
  onReset: (updated: FlashcardReviewEntity) => void;
}

/**
 * Delete and reset dialogs for the card shown in a review or exam session.
 *
 * @example
 * <ReviewSessionDialogs currentCard={card} deleteOpen={false} resetOpen={false} ... />
 */
export function ReviewSessionDialogs({
  currentCard,
  deleteOpen,
  resetOpen,
  onDeleteOpenChange,
  onResetOpenChange,
  onDeleted,
  onReset,
}: Readonly<ReviewSessionDialogsProps>) {
  if (!currentCard) {
    return null;
  }

  return (
    <>
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
