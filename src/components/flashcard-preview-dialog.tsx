"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FlashcardEntity } from "@/lib/api/contracts";

interface FlashcardPreviewDialogProps {
  flashcard: Pick<FlashcardEntity, "front" | "back">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlashcardPreviewDialog({
  flashcard,
  open,
  onOpenChange,
}: Readonly<FlashcardPreviewDialogProps>) {
  const t = useTranslations("FlashcardPreviewDialog");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <section className="space-y-1.5">
            <h3 className="text-sm font-medium">{t("front_label")}</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {flashcard.front}
            </p>
          </section>
          <section className="space-y-1.5">
            <h3 className="text-sm font-medium">{t("back_label")}</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {flashcard.back}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
