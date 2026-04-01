"use client";

import { RotateCw } from "lucide-react";
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
  const descriptionText =
    count === 1
      ? "Re-validate 1 flashcard?"
      : `Re-validate ${count} flashcards?`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Re-validate Flashcards?</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isValidating}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isValidating}>
            <AsyncButtonContent
              pending={isValidating}
              idleLabel="Re-validate"
              pendingLabel="Validating..."
              idleIcon={<RotateCw className="size-4" />}
            />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
