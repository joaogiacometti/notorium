"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteFolder } from "@/app/actions/folders";
import { FolderDeletionCounts } from "@/components/folders/folder-deletion-counts";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { FolderText } from "@/components/shared/folder-text";
import { invalidateFolderViews } from "@/lib/client-cache/invalidation";
import { folderDeletionSummaryQuery } from "@/lib/client-cache/queries";
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
  const summary = useQuery({
    ...folderDeletionSummaryQuery(folderId),
    enabled: open,
  });

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
      title="Delete folder"
      description={
        <>
          Are you sure you want to delete{" "}
          <FolderText
            value={folderName}
            mode="wrap"
            className="inline font-semibold text-foreground"
          />{" "}
          and everything in it? This action cannot be undone.
        </>
      }
      details={<FolderDeletionCounts summary={summary} />}
      // Confirm only once the user can see what the deletion removes.
      confirmDisabled={summary.isLoading}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      confirmVariant="destructive"
      cancelTestId="cancel-delete-folder"
      confirmTestId="confirm-delete-folder"
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
