"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteMindmap } from "@/app/actions/mindmaps";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface DeleteMindmapDialogProps {
  mindmapId: string;
  mindmapTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteMindmapDialog({
  mindmapId,
  mindmapTitle,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<DeleteMindmapDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMindmap({ id: mindmapId });
      if (result.success) {
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
      title="Delete Mindmap"
      description={
        <>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{mindmapTitle}</span>?
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
