"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteSubjects } from "@/app/actions/subjects";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface BulkDeleteSubjectsDialogProps {
  ids: string[];
  open: boolean;
  onDeleted: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkDeleteSubjectsDialog({
  ids,
  open,
  onDeleted,
  onOpenChange,
}: Readonly<BulkDeleteSubjectsDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const count = ids.length;

  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteSubjects({ ids });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
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
      title="Delete Subjects"
      description={
        count === 1
          ? "Delete 1 subject permanently. This action cannot be undone. All associated notes will also be deleted."
          : `Delete ${count} subjects permanently. This action cannot be undone. All associated notes will also be deleted.`
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
    />
  );
}
