"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { bulkUpdateAssessmentStatus } from "@/app/actions/assessments";
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

interface BulkUpdateAssessmentStatusDialogProps {
  ids: string[];
  open: boolean;
  status: "pending" | "completed";
  onOpenChange: (open: boolean) => void;
  onUpdated: (ids: string[]) => void;
}

function getDialogCopy(status: "pending" | "completed", count: number) {
  if (status === "completed") {
    return {
      title: "Mark Assessments Completed",
      description:
        count === 1
          ? "Mark 1 selected assessment as completed."
          : `Mark ${count} selected assessments as completed.`,
      idleLabel: "Mark Completed",
      pendingLabel: "Saving...",
    };
  }

  return {
    title: "Mark Assessments Pending",
    description:
      count === 1
        ? "Mark 1 selected assessment as pending."
        : `Mark ${count} selected assessments as pending.`,
    idleLabel: "Mark Pending",
    pendingLabel: "Saving...",
  };
}

export function BulkUpdateAssessmentStatusDialog({
  ids,
  open,
  status,
  onOpenChange,
  onUpdated,
}: Readonly<BulkUpdateAssessmentStatusDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const copy = getDialogCopy(status, ids.length);

  function handleConfirm() {
    startTransition(async () => {
      const result = await bulkUpdateAssessmentStatus({ ids, status });

      if (result.success) {
        onUpdated(result.ids);
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
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            <AsyncButtonContent
              pending={isPending}
              idleLabel={copy.idleLabel}
              pendingLabel={copy.pendingLabel}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
