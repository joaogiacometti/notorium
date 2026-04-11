"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteDeck } from "@/app/actions/decks";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Deck</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{deckName}"?{" "}
            {flashcardCount > 0 && (
              <>
                {flashcardCount} flashcard{flashcardCount === 1 ? "" : "s"} will
                be moved to the default deck.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <AsyncButtonContent
              pending={isDeleting}
              idleLabel="Delete"
              pendingLabel="Deleting..."
            />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
