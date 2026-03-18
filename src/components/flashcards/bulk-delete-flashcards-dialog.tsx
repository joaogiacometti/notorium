"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkDeleteFlashcards } from "@/app/actions/flashcards";
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

interface BulkDeleteFlashcardsDialogProps {
  ids: string[];
  open: boolean;
  onDeleted: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkDeleteFlashcardsDialog({
  ids,
  open,
  onDeleted,
  onOpenChange,
}: Readonly<BulkDeleteFlashcardsDialogProps>) {
  const t = useTranslations("BulkDeleteFlashcardsDialog");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteFlashcards({ ids });

      if (result.success) {
        onDeleted(result.ids);
        onOpenChange(false);
        return;
      }

      toast.error(resolveActionErrorMessage(result, tErrors));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { count: ids.length })}
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
            <AsyncButtonContent
              pending={isPending}
              idleLabel={t("confirm")}
              pendingLabel={tCommon("deleting")}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
