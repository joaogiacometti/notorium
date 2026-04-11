"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteFlashcards } from "@/app/actions/flashcards";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/server/server-action-errors";

interface BulkDeleteFlashcardsDialogProps {
  ids: string[];
  open: boolean;
  onDeleted: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkDeleteFlashcardsDialog({
  ids,
  open,
  onDeleted,
  onOpenChange,
}: Readonly<BulkDeleteFlashcardsDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteFlashcards({ ids });

      if (result.success) {
        onDeleted(result.ids);
        onOpenChange(false);
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
  }

  const count = ids.length;
  const descriptionText =
    count === 1
      ? "Delete 1 flashcard permanently."
      : `Delete ${count} flashcards permanently.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Flashcards</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <AsyncButtonContent
              pending={isPending}
              idleLabel="Delete"
              pendingLabel="Deleting..."
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
