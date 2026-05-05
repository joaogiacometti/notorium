"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkArchiveSubjects } from "@/app/actions/subjects";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive Subjects</DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Archive 1 subject. You can restore it later from archived subjects."
              : `Archive ${count} subjects. You can restore them later from archived subjects.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleArchive} disabled={isPending}>
            <AsyncButtonContent
              pending={isPending}
              idleLabel="Archive"
              pendingLabel="Archiving..."
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
