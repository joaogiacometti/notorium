"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteAssessments } from "@/app/actions/assessments";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Assessments</DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Delete 1 assessment permanently."
              : `Delete ${count} assessments permanently.`}
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
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <AsyncButtonContent
              pending={isPending}
              idleLabel="Delete"
              pendingLabel="Deleting..."
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
