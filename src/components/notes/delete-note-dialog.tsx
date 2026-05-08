"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteNote } from "@/app/actions/notes";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface DeleteNoteDialogProps {
  noteId: string;
  noteTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteNoteDialog({
  noteId,
  noteTitle,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<DeleteNoteDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteNote({ id: noteId });
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        if (onSuccess) {
          onSuccess();
        } else {
          onOpenChange(false);
        }
      } else {
        toast.error(t(result.errorCode, result.errorParams));
      }
    });
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Note"
      description={
        <>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{noteTitle}</span>?
          This action cannot be undone.
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
