"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkRestoreSubjects } from "@/app/actions/subjects";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore Subjects</DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Restore 1 archived subject."
              : `Restore ${count} archived subjects.`}
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
          <Button onClick={handleRestore} disabled={isPending}>
            <AsyncButtonContent
              pending={isPending}
              idleLabel="Restore"
              pendingLabel="Restoring..."
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
