"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAssessment } from "@/app/actions/assessments";
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

interface DeleteAssessmentDialogProps {
  assessmentId: string;
  assessmentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

export function DeleteAssessmentDialog({
  assessmentId,
  assessmentTitle,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<DeleteAssessmentDialogProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAssessment({ id: assessmentId });
      if (result.success) {
        onDeleted?.(result.id);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(resolveActionErrorMessage(result));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Assessment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {assessmentTitle}
            </span>
            ? This action cannot be undone.
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
