"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteMiss } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";

interface DeleteMissDialogProps {
  missId: string;
  missDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteMissDialog({
  missId,
  missDate,
  open,
  onOpenChange,
}: Readonly<DeleteMissDialogProps>) {
  const t = useTranslations("DeleteMissDialog");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");

  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMiss({ id: missId });
      if (result.success) {
        onOpenChange(false);
      } else {
        toast.error(resolveActionErrorMessage(result, tErrors));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("prompt_prefix")}
            <span className="font-semibold text-foreground">{missDate}</span>
            {t("prompt_suffix")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
