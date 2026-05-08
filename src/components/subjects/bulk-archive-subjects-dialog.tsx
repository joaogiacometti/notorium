"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkArchiveSubjects } from "@/app/actions/subjects";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { t } from "@/lib/server/server-action-errors";

interface BulkArchiveSubjectsDialogProps {
  ids: string[];
  open: boolean;
  onArchived: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkArchiveSubjectsDialog({
  ids,
  open,
  onArchived,
  onOpenChange,
}: Readonly<BulkArchiveSubjectsDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const count = ids.length;

  function handleArchive() {
    startTransition(async () => {
      const result = await bulkArchiveSubjects({ ids });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        onArchived(result.ids);
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
      title="Archive Subjects"
      description={
        count === 1
          ? "Archive 1 subject. You can restore it later from archived subjects."
          : `Archive ${count} subjects. You can restore them later from archived subjects.`
      }
      confirmLabel="Archive"
      pendingLabel="Archiving..."
      confirmVariant="default"
      isPending={isPending}
      onConfirm={handleArchive}
    />
  );
}
