"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAssessment } from "@/app/actions/assessments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteAssessmentDialogProps {
  assessmentId: string;
  assessmentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAssessmentDialog({
  assessmentId,
  assessmentTitle,
  open,
  onOpenChange,
}: Readonly<DeleteAssessmentDialogProps>) {
  const t = useTranslations("DeleteAssessmentDialog");
  const _tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAssessment({ id: assessmentId });
      if (result.success) {
        onOpenChange(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {"Are you sure you want to delete "}
            <span className="font-semibold text-foreground">
              {assessmentTitle}
            </span>
            {"? This action cannot be undone."}
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
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
