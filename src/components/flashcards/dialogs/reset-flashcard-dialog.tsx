"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resetFlashcard } from "@/app/actions/flashcards";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import type { FlashcardEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface ResetFlashcardDialogProps {
  flashcardId: string;
  flashcardFront: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset?: (flashcard: FlashcardEntity) => void;
  className?: string;
  overlayClassName?: string;
}

export function ResetFlashcardDialog({
  flashcardId,
  flashcardFront,
  open,
  onOpenChange,
  onReset,
  className,
  overlayClassName,
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
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset Flashcard"
      description={
        <>
          Are you sure you want to reset{" "}
          <span className="font-semibold text-foreground">
            {flashcardFrontPreview}
          </span>
          ? All review progress will be lost and the card will be treated as
          new.
        </>
      }
      confirmLabel="Reset"
      pendingLabel="Resetting..."
      confirmVariant="default"
      isPending={isPending}
      onConfirm={handleReset}
      className={className}
      overlayClassName={overlayClassName}
    />
  );
}
