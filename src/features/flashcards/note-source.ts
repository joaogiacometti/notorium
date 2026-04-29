import { LIMITS } from "@/lib/config/limits";
import { richTextToPlainTextWithImagePlaceholders } from "@/lib/editor/rich-text";

interface BuildNoteFlashcardSourceInput {
  title: string;
  content?: string | null;
}

/**
 * Builds bounded plain text from a note for AI flashcard generation.
 *
 * @example
 * buildNoteFlashcardSource({ title: "Lecture", content: "<p>ATP stores energy.</p>" })
 */
export function buildNoteFlashcardSource({
  title,
  content,
}: BuildNoteFlashcardSourceInput): string {
  const noteText = richTextToPlainTextWithImagePlaceholders(content ?? "");
  const sourceText = [`Title: ${title}`, noteText]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

  if (sourceText.length <= LIMITS.flashcardAiMaxInput) {
    return sourceText;
  }

  return sourceText.slice(0, LIMITS.flashcardAiMaxInput).trimEnd();
}
