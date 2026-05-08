"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteFlashcards } from "@/app/actions/flashcards";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
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
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Flashcards"
      description={descriptionText}
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
    />
  );
}
