"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resetFlashcard } from "@/app/actions/flashcards";
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
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import type { FlashcardEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface ResetFlashcardDialogProps {
  flashcardId: string;
  flashcardFront: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset?: (flashcard: FlashcardEntity) => void;
}

export function ResetFlashcardDialog({
  flashcardId,
  flashcardFront,
  open,
  onOpenChange,
  onReset,
}: Readonly<ResetFlashcardDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const flashcardFrontPreview = getRichTextExcerpt(flashcardFront, 120);

  function handleReset() {
    startTransition(async () => {
      const result = await resetFlashcard({ id: flashcardId });
      if (result.success) {
        onReset?.(result.flashcard);
        onOpenChange(false);
      } else {
        toast.error(t(result.errorCode, result.errorParams));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Flashcard</DialogTitle>
          <DialogDescription>
            Are you sure you want to reset{" "}
            <span className="font-semibold text-foreground">
              {flashcardFrontPreview}
            </span>
            ? All review progress will be lost and the card will be treated as
            new.
          </DialogDescription>
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
