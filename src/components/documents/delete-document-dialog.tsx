"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { type ActionErrorResult, t } from "@/lib/server/server-action-errors";

interface DeleteDocumentDialogProps {
  /** Singular kind name shown in the dialog, such as "Note" or "PDF". */
  kindLabel: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<{ success: true } | ActionErrorResult>;
  /** Runs after a successful delete; without it the dialog just closes. */
  onSuccess?: () => void;
}

/**
 * Delete confirmation shared by every document kind.
 *
 * @example
 * <DeleteDocumentDialog kindLabel="PDF" title={pdf.title} open onOpenChange={setOpen} onDelete={() => deletePdf({ id })} />
 */
export function DeleteDocumentDialog({
  kindLabel,
  title,
  open,
  onOpenChange,
  onDelete,
  onSuccess,
}: Readonly<DeleteDocumentDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await onDelete();
      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }
      if (onSuccess) {
        onSuccess();
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${kindLabel}`}
      description={
        <>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{title}</span>? This
          action cannot be undone.
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
