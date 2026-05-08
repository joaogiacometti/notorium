"use client";

import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: Readonly<UnsavedChangesDialogProps>) {
  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Discard changes?"
      description="You have unsaved edits. If you discard now, those changes will be lost."
      cancelLabel="Keep Editing"
      confirmLabel="Discard"
      pendingLabel="Discarding..."
      confirmVariant="destructive"
      isPending={false}
      onConfirm={onDiscard}
      showCloseButton={false}
    />
  );
}
