"use client";

import { RotateCw } from "lucide-react";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";

interface ValidateAgainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isValidating: boolean;
  count: number;
}

export function ValidateAgainDialog({
  open,
  onOpenChange,
  onConfirm,
  isValidating,
  count,
}: Readonly<ValidateAgainDialogProps>) {
  const descriptionText =
    count === 1
      ? "Re-validate 1 flashcard?"
      : `Re-validate ${count} flashcards?`;

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Re-validate Flashcards?"
      description={descriptionText}
      confirmLabel="Re-validate"
      pendingLabel="Validating..."
      confirmVariant="default"
      isPending={isValidating}
      onConfirm={onConfirm}
      confirmIcon={<RotateCw className="size-4" />}
    />
  );
}
