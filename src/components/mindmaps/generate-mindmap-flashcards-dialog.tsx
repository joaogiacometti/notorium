"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generateFlashcardsFromMindmap } from "@/app/actions/flashcard-generation";
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

interface GeneratedCard {
  front: string;
  back: string;
}

interface GenerateMindmapFlashcardsDialogProps {
  decks: DeckOption[];
  mindmapId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getGenerateErrorMessage(errorCode: string) {
  if (errorCode === "flashcards.ai.notConfigured") {
    return "AI features are not configured for this instance.";
  }
  if (errorCode === "limits.aiFlashcardGenerationPerDay") {
    return "Daily limit reached for AI flashcard generation.";
  }
  if (errorCode === "flashcards.ai.emptyGeneration") {
    return "Could not extract flashcards from this mindmap. Try adding more detail.";
  }
  if (errorCode === "limits.flashcardLimit") {
    return "Flashcard limit reached for this deck.";
  }

  return "AI service temporarily unavailable. Try again later.";
}

export function GenerateMindmapFlashcardsDialog({
  decks,
  mindmapId,
  open,
  onOpenChange,
}: Readonly<GenerateMindmapFlashcardsDialogProps>) {
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

    const result = await generateFlashcardsFromMindmap({
      mindmapId,
      deckId: selectedDeckId,
    });

    setIsGenerating(false);

    if (!result.success) {
      toast.error(getGenerateErrorMessage(result.errorCode));
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
            Choose where to save flashcards generated from this mindmap.
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
              <FieldGroup className="gap-4">
                <DeckSelect
                  value={selectedDeckId}
                  onChange={setSelectedDeckId}
                  decks={decks}
                  id="mindmap-flashcards-deck"
                />
              </FieldGroup>
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
