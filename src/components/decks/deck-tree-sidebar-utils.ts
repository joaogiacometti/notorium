import type { FlashcardsView } from "@/features/flashcards/view";
import type { DeckTreeNode } from "@/lib/server/api-contracts";

export const rootDeckId = "__flashcards_root__";
export const loadingRootDeckId = "__root__";

/**
 * Totals the already-computed subtree counts shown by the root sidebar row.
 *
 * @example
 * getTotalFlashcardsCount([{ flashcardCount: 2, children: [] } as DeckTreeNode])
 */
export function getTotalFlashcardsCount(nodes: DeckTreeNode[]): number {
  return nodes.reduce((total, node) => total + node.flashcardCount, 0);
}

/**
 * Builds the flashcards route used when selecting a deck from the sidebar.
 *
 * @example
 * buildDeckViewHref("manage", "deck-1")
 */
export function buildDeckViewHref(
  view: FlashcardsView,
  deckId?: string,
): string {
  const params = new URLSearchParams();
  params.set("view", view);

  if (deckId) {
    params.set("deckId", deckId);
  }

  return `/flashcards?${params.toString()}`;
}
