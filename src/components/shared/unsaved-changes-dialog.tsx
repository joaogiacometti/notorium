"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: Readonly<UnsavedChangesDialogProps>) {
  const t = useTranslations("UnsavedChangesDialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("keep")}
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            {t("discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
