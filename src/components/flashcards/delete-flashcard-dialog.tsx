"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteFlashcard } from "@/app/actions/flashcards";
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
import { t } from "@/lib/server/server-action-errors";

interface DeleteFlashcardDialogProps {
  flashcardId: string;
  flashcardFront: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

export function DeleteFlashcardDialog({
  flashcardId,
  flashcardFront,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<DeleteFlashcardDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const flashcardFrontPreview = getRichTextExcerpt(flashcardFront, 120);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFlashcard({ id: flashcardId });
      if (result.success) {
        onDeleted?.(result.id);
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
          <DialogTitle>Delete Flashcard</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {flashcardFrontPreview}
            </span>
            ? This action cannot be undone.
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
