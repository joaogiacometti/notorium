"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBook } from "@/app/actions/library";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface DeleteBookDialogProps {
  bookId: string;
  bookTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBookDialog({
  bookId,
  bookTitle,
  open,
  onOpenChange,
}: Readonly<DeleteBookDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteBook({ bookId });
      if (result.success) {
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
      title="Delete Book"
      description={
        <>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{bookTitle}</span>?
          This removes the file and your saved page, and cannot be undone.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
