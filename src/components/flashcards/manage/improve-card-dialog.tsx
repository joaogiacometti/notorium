"use client";

import { toast } from "sonner";
import { editFlashcard } from "@/app/actions/flashcards";
import { FlashcardBackDiff } from "@/components/flashcards/dialogs/flashcard-back-diff";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RefineCardSummary } from "@/features/flashcards/refine/types";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface ImproveCardDialogProps {
  card: RefineCardSummary;
  proposedBack: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImproved: () => void;
}

export function ImproveCardDialog({
  card,
  proposedBack,
  open,
  onOpenChange,
  onImproved,
}: Readonly<ImproveCardDialogProps>) {
  async function handleAccept() {
    const result = await editFlashcard({
      id: card.id,
      type: "basic",
      subjectId: card.subjectId ?? "",
      front: card.front,
      back: proposedBack,
    });

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      return;
    }

    toast.success("Flashcard back improved.");
    onOpenChange(false);
    onImproved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Improve flashcard</DialogTitle>
          <DialogDescription>
            {getRichTextExcerpt(card.front, 100)}
          </DialogDescription>
        </DialogHeader>
        <FlashcardBackDiff
          previousBack={card.back}
          proposedBack={proposedBack}
          originalLabel="Current back"
          proposedLabel="Improved back"
          acceptLabel="Accept improvement"
          rejectLabel="Discard"
          onAccept={handleAccept}
          onReject={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
