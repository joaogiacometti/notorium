"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteFolder } from "@/app/actions/folders";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { FolderText } from "@/components/shared/folder-text";
import { invalidateFolderViews } from "@/lib/client-cache/invalidation";
import { t } from "@/lib/server/server-action-errors";

interface DeleteFolderDialogProps {
  folderId: string;
  folderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteFolderDialog({
  folderId,
  folderName,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<DeleteFolderDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteFolder({ id: folderId });
      if (result.success) {
        await invalidateFolderViews(queryClient);
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
      title="Delete Folder"
      description={
        <>
          Are you sure you want to delete{" "}
          <FolderText
            value={folderName}
            mode="wrap"
            className="inline font-semibold text-foreground"
          />
          ? This action cannot be undone. Nested folders and all associated
          notes, flashcards, and attachments will also be deleted.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      cancelTestId="cancel-delete-folder"
      confirmTestId="confirm-delete-folder"
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
