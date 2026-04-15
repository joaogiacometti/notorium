"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  getAllFlashcardIds,
  getFlashcardIdsForDeck,
  validateFlashcards,
} from "@/app/actions/flashcards";
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
import { FieldGroup } from "@/components/ui/field";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardValidationIssue,
  FlashcardValidationItem,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface ValidateFlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValidationStarted: (
    issues: FlashcardValidationIssue[],
    flashcards: FlashcardValidationItem[],
  ) => void;
  currentDeckId?: string;
}

export function ValidateFlashcardsDialog({
  open,
  onOpenChange,
  onValidationStarted,
  currentDeckId,
}: Readonly<ValidateFlashcardsDialogProps>) {
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);

    try {
      let flashcardIds: string[];

      if (currentDeckId) {
        const idsResult = await getFlashcardIdsForDeck({
          deckId: currentDeckId,
        });

        if ("errorCode" in idsResult) {
          toast.error(t(idsResult.errorCode, idsResult.errorParams));
          setIsValidating(false);
          return;
        }

        flashcardIds = idsResult.flashcardIds;
      } else {
        const idsResult = await getAllFlashcardIds();

        if ("errorCode" in idsResult) {
          toast.error(t(idsResult.errorCode, idsResult.errorParams));
          setIsValidating(false);
          return;
        }

        flashcardIds = idsResult.flashcardIds;
      }

      if (flashcardIds.length === 0) {
        toast.error("No flashcards to validate.");
        setIsValidating(false);
        return;
      }

      if (flashcardIds.length > LIMITS.flashcardBatchSize) {
        toast.error(
          `Too many flashcards. Maximum ${LIMITS.flashcardBatchSize} cards per validation.`,
        );
        setIsValidating(false);
        return;
      }

      const result = await validateFlashcards({ flashcardIds });

      if ("errorCode" in result) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      onValidationStarted(result.issues, result.flashcards);
      onOpenChange(false);

      if (result.issues.length === 0) {
        toast.success("No issues found! All flashcards look good.");
      } else {
        const count = result.issues.length;
        toast.success(
          `${count} ${count === 1 ? "card" : "cards"} with issues found.`,
        );
      }
    } catch (_error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const scopeLabel = currentDeckId ? "the selected deck" : "all flashcards";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Validate Flashcards</DialogTitle>
          <DialogDescription>
            Use AI to check for incorrect information, confusing content, or
            duplicate cards in {scopeLabel}.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-3">
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isValidating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
            >
              <AsyncButtonContent
                pending={isValidating}
                idleLabel="Validate"
                pendingLabel="Validating..."
                idleIcon={<Sparkles className="size-4" />}
              />
            </Button>
          </DialogFooter>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}
