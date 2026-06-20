"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generateFlashcards } from "@/app/actions/flashcard-generation";
import { createFlashcard } from "@/app/actions/flashcards";
import { GenerateFlashcardsReview } from "@/components/flashcards/dialogs/generate-flashcards-review";
import { DeckSelect } from "@/components/shared/deck-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import type { DeckOption, FlashcardEntity } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface GeneratedCard {
  front: string;
  back: string;
}

interface ReaderFlashcardsDialogProps {
  decks: DeckOption[];
  sourceText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generates flashcards from the passage the reader selected, then reuses the
// shared review/create flow so the user picks which cards to keep.
export function ReaderFlashcardsDialog({
  decks,
  sourceText,
  open,
  onOpenChange,
}: Readonly<ReaderFlashcardsDialogProps>) {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    decks[0]?.id ?? null,
  );
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[] | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  async function handleGenerate() {
    if (!selectedDeckId) {
      toast.error("Select a deck before generating flashcards.");
      return;
    }

    setIsGenerating(true);
    setGeneratedCards(null);

    const result = await generateFlashcards({
      deckId: selectedDeckId,
      text: sourceText,
    });

    setIsGenerating(false);

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      return;
    }

    setGeneratedCards(result.cards);
  }

  async function handleCreateCards(cards: GeneratedCard[]): Promise<number> {
    setIsCreating(true);

    let createdCount = 0;
    let hitLimit = false;
    const createdFlashcards: FlashcardEntity[] = [];

    for (const card of cards) {
      const result = await createFlashcard({
        type: "basic",
        deckId: selectedDeckId ?? "",
        front: card.front,
        back: card.back,
      });

      if (result.success) {
        createdCount++;
        createdFlashcards.push(result.flashcard);
      } else if (result.errorCode === "limits.flashcardLimit") {
        hitLimit = true;
        break;
      }
    }

    setIsCreating(false);

    if (createdCount === cards.length) {
      toast.success(
        `Created ${createdCount} flashcard${createdCount === 1 ? "" : "s"}`,
      );
      setGeneratedCards(null);
      onOpenChange(false);
    } else if (hitLimit) {
      toast.error(
        `Flashcard limit reached. Created ${createdCount} of ${cards.length} flashcards.`,
      );
    } else {
      toast.error(
        `Created ${createdCount} of ${cards.length} flashcards. Some may have duplicate fronts.`,
      );
    }

    return createdFlashcards.length;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setGeneratedCards(null);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
          <DialogTitle>Generate Flashcards</DialogTitle>
          <DialogDescription>
            Choose where to save flashcards generated from the selected passage.
          </DialogDescription>
        </DialogHeader>

        {generatedCards ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-5 sm:px-6">
            <GenerateFlashcardsReview
              cards={generatedCards}
              onCardsChange={setGeneratedCards}
              onCreate={handleCreateCards}
              onBack={() => setGeneratedCards(null)}
              isCreating={isCreating}
            />
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleGenerate();
            }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-5 sm:px-6">
              <blockquote className="mb-4 max-h-32 overflow-y-auto rounded-md border-border border-l-2 bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
                {sourceText}
              </blockquote>
              {decks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Create a deck first to generate flashcards.
                </p>
              ) : (
                <FieldGroup className="gap-4">
                  <DeckSelect
                    value={selectedDeckId}
                    onChange={setSelectedDeckId}
                    decks={decks}
                    id="reader-flashcards-deck"
                  />
                </FieldGroup>
              )}
            </div>
            <div className="shrink-0 border-t px-4 py-4 sm:px-6">
              <Button
                type="submit"
                disabled={isGenerating || !selectedDeckId}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Generate Flashcards
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
