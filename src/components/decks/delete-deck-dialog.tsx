"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteDeck } from "@/app/actions/decks";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface DeleteDeckDialogProps {
  deckId: string;
  deckName: string;
  flashcardCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (deckId: string) => void;
}

export function DeleteDeckDialog({
  deckId,
  deckName,
  flashcardCount,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<DeleteDeckDialogProps>) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteDeck({ id: deckId });
      if (result.success) {
        onDeleted?.(result.id);
        onOpenChange(false);
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Deck"
      description={
        <>
          Are you sure you want to delete "{deckName}"? This also deletes all
          nested sub-decks and their flashcards.{" "}
          {flashcardCount > 0 && (
            <>
              {flashcardCount} flashcard{flashcardCount === 1 ? "" : "s"} in
              this deck will also be deleted.
            </>
          )}
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isDeleting}
      onConfirm={handleDelete}
    />
  );
}
