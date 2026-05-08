"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteFlashcard } from "@/app/actions/flashcards";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import { t } from "@/lib/server/server-action-errors";

interface DeleteFlashcardDialogProps {
  flashcardId: string;
  flashcardFront: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
  className?: string;
  overlayClassName?: string;
}

export function DeleteFlashcardDialog({
  flashcardId,
  flashcardFront,
  open,
  onOpenChange,
  onDeleted,
  className,
  overlayClassName,
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
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Flashcard"
      description={
        <>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">
            {flashcardFrontPreview}
          </span>
          ? This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
      className={className}
      overlayClassName={overlayClassName}
    />
  );
}
