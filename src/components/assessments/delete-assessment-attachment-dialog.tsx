"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAssessmentFiles } from "@/components/assessments/assessment-attachment-actions";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
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
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Attachment"
      description={
        <>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">
            {attachment?.fileName ?? "this attachment"}
          </span>
          ? This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
      confirmDisabled={!attachment}
    />
  );
}
