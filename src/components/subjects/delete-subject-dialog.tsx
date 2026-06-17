"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteSubject } from "@/app/actions/subjects";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { SubjectText } from "@/components/shared/subject-text";
import { t } from "@/lib/server/server-action-errors";

interface DeleteSubjectDialogProps {
  subjectId: string;
  subjectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteSubjectDialog({
  subjectId,
  subjectName,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<DeleteSubjectDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteSubject({ id: subjectId });
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        if (onSuccess) {
          onSuccess();
        } else {
          onOpenChange(false);
        }
      } else {
        toast.error(t(result.errorCode, result.errorParams));
      }
    });
  }

  return (
    <ActionConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Subject"
      description={
        <>
          Are you sure you want to delete{" "}
          <SubjectText
            value={subjectName}
            mode="wrap"
            className="inline font-semibold text-foreground"
          />
          ? This action cannot be undone. All associated notes will also be
          deleted.
        </>
      }
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirmVariant="destructive"
      cancelTestId="cancel-delete-subject"
      confirmTestId="confirm-delete-subject"
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
