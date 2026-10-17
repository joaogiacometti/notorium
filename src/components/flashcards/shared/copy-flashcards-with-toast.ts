import { toast } from "sonner";
import {
  copyFlashcardsToClipboard,
  type FlashcardCopySource,
  NoFlashcardsToCopyError,
} from "@/lib/clipboard/flashcard-content";

/**
 * Copies flashcards as Markdown and reports the outcome in a toast, so every
 * copy entry point (manage, detail page, review) gives the same feedback.
 * Pass the pending fetch itself, not its awaited result, to keep the clipboard
 * write inside the user's click.
 *
 * @example
 * void copyFlashcardsWithToast(fetchFlashcardContents(selectedIds));
 */
export async function copyFlashcardsWithToast(
  cards:
    | readonly FlashcardCopySource[]
    | Promise<readonly FlashcardCopySource[]>,
): Promise<void> {
  try {
    const copiedCount = await copyFlashcardsToClipboard(cards);
    toast.success(
      copiedCount === 1
        ? "Flashcard copied."
        : `${copiedCount} flashcards copied.`,
    );
  } catch (error) {
    toast.error(
      error instanceof NoFlashcardsToCopyError
        ? "These flashcards no longer exist."
        : "Could not copy flashcards.",
    );
  }
}
