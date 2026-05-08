"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteAssessments } from "@/app/actions/assessments";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface BulkDeleteAssessmentsDialogProps {
  ids: string[];
  open: boolean;
  onDeleted: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkDeleteAssessmentsDialog({
  ids,
  open,
  onDeleted,
  onOpenChange,
}: Readonly<BulkDeleteAssessmentsDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const count = ids.length;

  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteAssessments({ ids });

      if (result.success) {
        onDeleted(result.ids);
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
      title="Delete Assessments"
      description={
        count === 1
          ? "Delete 1 assessment permanently."
          : `Delete ${count} assessments permanently.`
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
    />
  );
}
