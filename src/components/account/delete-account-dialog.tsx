"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAccount } from "@/app/actions/account";
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

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: Readonly<DeleteAccountDialogProps>) {
  const t = useTranslations("DeleteAccountDialog");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && !result.success) {
        toast.error(resolveActionErrorMessage(result, tErrors));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
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
            <AsyncButtonContent
              pending={isPending}
              idleLabel={t("title")}
              pendingLabel={tCommon("deleting")}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
