"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { resetFlashcard } from "@/app/actions/flashcards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";

interface ResetFlashcardDialogProps {
  flashcardId: string;
  flashcardFront: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset?: (flashcard: FlashcardEntity) => void;
}

export function ResetFlashcardDialog({
  flashcardId,
  flashcardFront,
  open,
  onOpenChange,
  onReset,
}: Readonly<ResetFlashcardDialogProps>) {
  const t = useTranslations("ResetFlashcardDialog");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ServerActions");
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await resetFlashcard({ id: flashcardId });
      if (result.success) {
        onReset?.(result.flashcard);
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
            <span className="font-semibold text-foreground">
              {flashcardFront}
            </span>
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
          <Button onClick={handleReset} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
