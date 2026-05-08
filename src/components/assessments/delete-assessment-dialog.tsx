"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAssessment } from "@/app/actions/assessments";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
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
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAssessment({ id: assessmentId });
      if (result.success) {
        onDeleted?.(result.id);
        onOpenChange(false);
      } else {
        toast.error(resolveActionErrorMessage(result));
      }
    });
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Assessment"
      description={
        <>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">
            {assessmentTitle}
          </span>
          ? This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      isPending={isPending}
      onConfirm={handleDelete}
    />
  );
}
