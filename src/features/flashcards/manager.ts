import { richTextToPlainText } from "@/lib/editor/rich-text";
import type { FlashcardListEntity } from "@/lib/server/api-contracts";

interface FilterFlashcardListInput {
  flashcards: FlashcardListEntity[];
  searchQuery: string;
  subjectId?: string;
}

export function filterFlashcardList({
  flashcards,
  searchQuery,
  subjectId,
}: FilterFlashcardListInput): FlashcardListEntity[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return flashcards.filter((card) => {
    if (subjectId && card.subjectId !== subjectId) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    const frontText = richTextToPlainText(card.front).toLowerCase();
    const backText = richTextToPlainText(card.back).toLowerCase();
    const subjectName = card.subjectName.toLowerCase();

    return (
      frontText.includes(normalizedSearch) ||
      backText.includes(normalizedSearch) ||
      subjectName.includes(normalizedSearch)
    );
  });
}
