"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteBooks } from "@/app/actions/library";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface BulkDeleteBooksDialogProps {
  ids: string[];
  open: boolean;
  onDeleted: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkDeleteBooksDialog({
  ids,
  open,
  onDeleted,
  onOpenChange,
}: Readonly<BulkDeleteBooksDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const count = ids.length;

  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteBooks({ ids });

      if (result.success) {
        onDeleted(result.ids);
        onOpenChange(false);
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Books"
      description={
        count === 1
          ? "Delete 1 book permanently. This removes the file and your saved page, and cannot be undone."
          : `Delete ${count} books permanently. This removes the files and your saved pages, and cannot be undone.`
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
    />
  );
}
