"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkRestoreSubjects } from "@/app/actions/subjects";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface BulkRestoreSubjectsDialogProps {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: (ids: string[]) => void;
}

export function BulkRestoreSubjectsDialog({
  ids,
  open,
  onOpenChange,
  onRestored,
}: Readonly<BulkRestoreSubjectsDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const count = ids.length;

  function handleRestore() {
    startTransition(async () => {
      const result = await bulkRestoreSubjects({ ids });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        onRestored(result.ids);
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
      title="Restore Subjects"
      description={
        count === 1
          ? "Restore 1 archived subject."
          : `Restore ${count} archived subjects.`
      }
      confirmLabel="Restore"
      pendingLabel="Restoring..."
      confirmVariant="default"
      isPending={isPending}
      onConfirm={handleRestore}
    />
  );
}
