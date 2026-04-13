"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkResetFlashcards } from "@/app/actions/flashcards";
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

interface BulkResetFlashcardsDialogProps {
  ids: string[];
  open: boolean;
  onReset: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkResetFlashcardsDialog({
  ids,
  open,
  onReset,
  onOpenChange,
}: Readonly<BulkResetFlashcardsDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await bulkResetFlashcards({ ids });

      if (result.success) {
        onReset(result.ids);
        onOpenChange(false);
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
  }

  const count = ids.length;
  const descriptionText =
    count === 1
      ? "Reset review progress for 1 selected flashcard."
      : `Reset review progress for ${count} selected flashcards.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Flashcards</DialogTitle>
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
          <Button onClick={handleReset} disabled={isPending}>
            <AsyncButtonContent
              pending={isPending}
              idleLabel="Reset"
              pendingLabel="Resetting..."
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
