"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
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

interface ValidateAgainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isValidating: boolean;
  count: number;
}

export function ValidateAgainDialog({
  open,
  onOpenChange,
  onConfirm,
  isValidating,
  count,
}: Readonly<ValidateAgainDialogProps>) {
  const t = useTranslations("FlashcardsManager");
  const tCommon = useTranslations("Common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("validate_again_title")}</DialogTitle>
          <DialogDescription>
            {t("validate_again_description", { count })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isValidating}
          >
            {tCommon("cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isValidating}>
            <AsyncButtonContent
              pending={isValidating}
              idleLabel={t("validate_again_confirm")}
              pendingLabel={t("validating")}
              idleIcon={<RotateCw className="size-4" />}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
