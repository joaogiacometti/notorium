"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteFlashcard } from "@/app/actions/flashcards";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { invalidateFlashcardViews } from "@/lib/client-cache/invalidation";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentExcerpt } from "@/lib/editor/document-content";
import { t } from "@/lib/server/server-action-errors";

interface DeleteFlashcardDialogProps {
  flashcardId: string;
  flashcardFront: RichTextDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void | Promise<void>;
}

export function DeleteFlashcardDialog({
  flashcardId,
  flashcardFront,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<DeleteFlashcardDialogProps>) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const flashcardFrontPreview = documentExcerpt(flashcardFront, 120);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFlashcard({ id: flashcardId });
      if (result.success) {
        await invalidateFlashcardViews(queryClient);
        await onDeleted?.(result.id);
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
    />
  );
}
