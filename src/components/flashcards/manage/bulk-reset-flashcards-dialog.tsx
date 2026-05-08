"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkResetFlashcards } from "@/app/actions/flashcards";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
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
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset Flashcards"
      description={descriptionText}
      confirmLabel="Reset"
      pendingLabel="Resetting..."
      confirmVariant="default"
      isPending={isPending}
      onConfirm={handleReset}
    />
  );
}
