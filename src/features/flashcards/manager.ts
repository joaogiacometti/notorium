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

interface DeriveFlashcardsManagerStateInput {
  allSubjectsValue: string;
  flashcards: FlashcardListEntity[];
  maxFlashcardsPerSubject: number;
  page: number;
  pageSize: number;
  searchQuery: string;
  selectedSubjectId: string;
}

export function deriveFlashcardsManagerState({
  allSubjectsValue,
  flashcards,
  maxFlashcardsPerSubject,
  page,
  pageSize,
  searchQuery,
  selectedSubjectId,
}: DeriveFlashcardsManagerStateInput) {
  const selectedActionSubjectId =
    selectedSubjectId === allSubjectsValue ? undefined : selectedSubjectId;
  const selectedSubjectCardCount = selectedActionSubjectId
    ? flashcards.filter((card) => card.subjectId === selectedActionSubjectId)
        .length
    : 0;
  const filteredFlashcards = filterFlashcardList({
    flashcards,
    searchQuery,
    subjectId: selectedActionSubjectId,
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredFlashcards.length / pageSize),
  );
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;

  return {
    clampedPage,
    filteredFlashcards,
    isAtSubjectLimit: selectedSubjectCardCount >= maxFlashcardsPerSubject,
    paginatedFlashcards: filteredFlashcards.slice(
      startIndex,
      startIndex + pageSize,
    ),
    selectedActionSubjectId,
    selectedSubjectCardCount,
    totalPages,
  };
}
