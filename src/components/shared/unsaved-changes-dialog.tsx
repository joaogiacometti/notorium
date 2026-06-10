"use client";

import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  className?: string;
  overlayClassName?: string;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  className,
  overlayClassName,
}: Readonly<UnsavedChangesDialogProps>) {
  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      className={className}
      overlayClassName={overlayClassName}
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
