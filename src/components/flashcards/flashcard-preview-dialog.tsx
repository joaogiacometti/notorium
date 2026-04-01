"use client";

import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Flashcard Preview</DialogTitle>
          <DialogDescription>
            Review the full front and back before editing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <section className="space-y-1.5">
            <h3 className="text-sm font-medium">Front</h3>
            <TiptapRenderer
              content={flashcard.front}
              className="min-w-0 wrap-break-word hyphens-auto text-sm text-muted-foreground"
            />
          </section>
          <section className="space-y-1.5">
            <h3 className="text-sm font-medium">Back</h3>
            <TiptapRenderer
              content={flashcard.back}
              className="min-w-0 wrap-break-word hyphens-auto text-sm text-muted-foreground"
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
