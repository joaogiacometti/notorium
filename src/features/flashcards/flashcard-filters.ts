import { richTextToPlainText } from "@/lib/editor/rich-text";
import type { FlashcardListEntity } from "@/lib/server/api-contracts";

interface FilterFlashcardsInput {
  flashcards: FlashcardListEntity[];
  searchQuery: string;
  subjectId?: string;
}

export function filterFlashcards({
  flashcards,
  searchQuery,
  subjectId,
}: FilterFlashcardsInput): FlashcardListEntity[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return flashcards.filter((flashcard) => {
    const matchesSubject =
      subjectId === undefined ? true : flashcard.subjectId === subjectId;

    if (!matchesSubject) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    const frontText = richTextToPlainText(flashcard.front).toLowerCase();
    const backText = richTextToPlainText(flashcard.back).toLowerCase();
    const subjectName = flashcard.subjectName.toLowerCase();

    return (
      frontText.includes(normalizedSearch) ||
      backText.includes(normalizedSearch) ||
      subjectName.includes(normalizedSearch)
    );
  });
}
