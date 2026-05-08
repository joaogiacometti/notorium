"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { archiveSubject, deleteSubject } from "@/app/actions/subjects";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { SubjectText } from "@/components/shared/subject-text";
import { t } from "@/lib/server/server-action-errors";

interface DeleteSubjectDialogProps {
  subjectId: string;
  subjectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "archive" | "delete";
}

export function DeleteSubjectDialog({
  subjectId,
  subjectName,
  open,
  onOpenChange,
  onSuccess,
  mode = "delete",
}: Readonly<DeleteSubjectDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function handleConfirm() {
    startTransition(async () => {
      const result =
        mode === "archive"
          ? await archiveSubject({ id: subjectId })
          : await deleteSubject({ id: subjectId });
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
      title={mode === "archive" ? "Archive Subject" : "Delete Subject"}
      description={
        <>
          {mode === "archive"
            ? "Are you sure you want to archive "
            : "Are you sure you want to delete "}
          <SubjectText
            value={subjectName}
            mode="wrap"
            className="inline font-semibold text-foreground"
          />
          {mode === "archive"
            ? "? You can restore it later from archived subjects."
            : "? This action cannot be undone. All associated notes will also be deleted."}
        </>
      }
      confirmLabel={mode === "archive" ? "Archive" : "Delete"}
      pendingLabel={mode === "archive" ? "Archiving..." : "Deleting..."}
      confirmVariant={mode === "archive" ? "default" : "destructive"}
      cancelTestId="cancel-delete-subject"
      confirmTestId={
        mode === "archive"
          ? "confirm-archive-subject"
          : "confirm-delete-subject"
      }
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
