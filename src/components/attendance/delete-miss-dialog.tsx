"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteMiss } from "@/app/actions/attendance";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface DeleteMissDialogProps {
  missId: string;
  missDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

export function DeleteMissDialog({
  missId,
  missDate,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<DeleteMissDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMiss({ id: missId });
      if (result.success) {
        onDeleted?.(missId);
        onOpenChange(false);
      } else {
        toast.error(resolveActionErrorMessage(result));
      }
    });
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove Miss"
      description={
        <>
          Are you sure you want to remove the miss recorded for{" "}
          <span className="font-semibold text-foreground">{missDate}</span>?
          This action cannot be undone.
        </>
      }
      confirmLabel="Remove"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
    />
  );
}
