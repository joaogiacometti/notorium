"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAssessmentFiles } from "@/components/assessments/assessment-attachment-actions";
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
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface DeleteAssessmentAttachmentDialogProps {
  attachment: AssessmentAttachmentEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}

/**
 * Confirms attachment deletion before removing the stored assessment file.
 *
 * @example
 * <DeleteAssessmentAttachmentDialog attachment={target} open onOpenChange={setOpen} onDeleted={removeAttachment} />
 */
export function DeleteAssessmentAttachmentDialog({
  attachment,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<DeleteAssessmentAttachmentDialogProps>) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!attachment) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAssessmentFiles([attachment.id]);
      if (result.success) {
        onDeleted(attachment.id);
        onOpenChange(false);
        return;
      }

      toast.error(resolveActionErrorMessage(result));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Attachment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {attachment?.fileName ?? "this attachment"}
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
            disabled={isPending || !attachment}
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
