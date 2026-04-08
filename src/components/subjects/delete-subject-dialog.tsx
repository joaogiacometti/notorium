"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { archiveSubject, deleteSubject } from "@/app/actions/subjects";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectText } from "@/components/shared/subject-text";
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
  const router = useRouter();
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
          router.refresh();
        }
      } else {
        toast.error(t(result.errorCode, result.errorParams));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "archive" ? "Archive Subject" : "Delete Subject"}
          </DialogTitle>
          <DialogDescription>
            {mode === "archive"
              ? "Are you sure you want to archive "
              : "Are you sure you want to delete "}
            <SubjectText
              value={subjectName}
              mode="wrap"
              className="font-semibold text-foreground"
            />
            {mode === "archive"
              ? "? You can restore it later from archived subjects."
              : "? This action cannot be undone. All associated notes will also be deleted."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            data-testid="cancel-delete-subject"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={mode === "archive" ? "default" : "destructive"}
            data-testid={
              mode === "archive"
                ? "confirm-archive-subject"
                : "confirm-delete-subject"
            }
            onClick={handleConfirm}
            disabled={isPending}
          >
            <AsyncButtonContent
              pending={isPending}
              idleLabel={mode === "archive" ? "Archive" : "Delete"}
              pendingLabel={mode === "archive" ? "Archiving..." : "Deleting..."}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
