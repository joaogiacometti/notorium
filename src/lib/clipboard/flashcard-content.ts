import { writePendingTextToClipboard } from "@/lib/clipboard/clipboard-writer";
import { richTextToMarkdown } from "@/lib/clipboard/rich-text-markdown";

/** The card fields a copy needs; manage, detail, and review all have them. */
export interface FlashcardCopySource {
  front: string;
  back: string;
  subjectPath: string;
}

type FlashcardCopySources = readonly FlashcardCopySource[];

/** A copy resolved to no cards, e.g. every requested card was deleted. */
export class NoFlashcardsToCopyError extends Error {
  constructor() {
    super("Expected at least one flashcard to copy, received 0");
    this.name = "NoFlashcardsToCopyError";
  }
}

/**
 * Formats flashcards as one Markdown document for an AI chat or a message. A
 * single card is its subject, front, and back; several cards get numbered
 * headings and `---` separators so each stays distinct.
 *
 * @example
 * formatFlashcardsAsMarkdown([
 *   { front: "<p>What is ATP?</p>", back: "<p>Energy</p>", subjectPath: "Bio" },
 * ]);
 */
export function formatFlashcardsAsMarkdown(
  cards: FlashcardCopySources,
): string {
  const [firstCard] = cards;
  if (!firstCard) {
    throw new NoFlashcardsToCopyError();
  }
  if (cards.length === 1) {
    return formatFlashcardBody(firstCard);
  }
  return cards
    .map(
      (card, index) => `## Card ${index + 1}\n\n${formatFlashcardBody(card)}`,
    )
    .join("\n\n---\n\n");
}

/**
 * Copies flashcards to the clipboard as Markdown and resolves with how many
 * were copied. `cards` may still be loading; the clipboard write starts right
 * away so it stays inside the click that requested it.
 *
 * @example
 * const copiedCount = await copyFlashcardsToClipboard(fetchCards(ids));
 */
export async function copyFlashcardsToClipboard(
  cards: FlashcardCopySources | Promise<FlashcardCopySources>,
): Promise<number> {
  const loadedCards = Promise.resolve(cards);
  const markdown = loadedCards.then(formatFlashcardsAsMarkdown);
  try {
    await writePendingTextToClipboard(markdown);
  } catch (writeError) {
    // Browsers may reject the write with a generic NotAllowedError when its
    // content fails, so surface the content's own failure (no cards, failed
    // fetch) when there is one.
    await markdown;
    throw writeError;
  }
  return (await loadedCards).length;
}

function formatFlashcardBody(card: FlashcardCopySource): string {
  const subjectLine = card.subjectPath ? `Subject: ${card.subjectPath}` : "";
  return [
    subjectLine,
    "### Front",
    richTextToMarkdown(card.front),
    "### Back",
    richTextToMarkdown(card.back),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
}
