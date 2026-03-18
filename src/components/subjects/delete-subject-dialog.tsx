"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

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
  const t = useTranslations("DeleteSubjectDialog");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
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
        toast.error(resolveActionErrorMessage(result, tErrors));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "archive" ? t("archive_title") : t("delete_title")}
          </DialogTitle>
          <DialogDescription>
            {mode === "archive" ? t("archive_prompt") : t("delete_prompt")}
            <SubjectText
              value={subjectName}
              mode="wrap"
              className="font-semibold text-foreground"
            />
            {mode === "archive" ? t("archive_suffix") : t("delete_suffix")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            data-testid="cancel-delete-subject"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tCommon("cancel")}
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
              idleLabel={
                mode === "archive" ? t("archive_action") : t("delete_action")
              }
              pendingLabel={
                mode === "archive" ? tCommon("archiving") : tCommon("deleting")
              }
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
