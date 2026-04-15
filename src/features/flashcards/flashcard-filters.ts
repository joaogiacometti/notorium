import { richTextToPlainText } from "@/lib/editor/rich-text";
import type { FlashcardListEntity } from "@/lib/server/api-contracts";

interface FilterFlashcardsInput {
  flashcards: FlashcardListEntity[];
  searchQuery: string;
  deckId?: string;
}

export function filterFlashcards({
  flashcards,
  searchQuery,
  deckId,
}: FilterFlashcardsInput): FlashcardListEntity[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return flashcards.filter((flashcard) => {
    const matchesDeck =
      deckId === undefined ? true : flashcard.deckId === deckId;

    if (!matchesDeck) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    const frontText = richTextToPlainText(flashcard.front).toLowerCase();
    const backText = richTextToPlainText(flashcard.back).toLowerCase();
    const deckName = flashcard.deckName.toLowerCase();

    return (
      frontText.includes(normalizedSearch) ||
      backText.includes(normalizedSearch) ||
      deckName.includes(normalizedSearch)
    );
  });
}
