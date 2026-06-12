import type { FlashcardsView } from "@/features/flashcards/view";
import type { DeckTreeNode } from "@/lib/server/api-contracts";
import { getExpandedIdsForVisibleTree } from "@/lib/trees/deck-tree";

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

/**
 * Bumps the flashcard count of a deck and every ancestor after a card is added,
 * returning a new tree with only the affected branch re-created.
 *
 * @example
 * incrementDeckTreeFlashcardCount(tree, "deck-1")
 */
export function incrementDeckTreeFlashcardCount(
  nodes: DeckTreeNode[],
  deckId: string,
): DeckTreeNode[] {
  return nodes.map((node) => {
    if (node.id === deckId) {
      return { ...node, flashcardCount: node.flashcardCount + 1 };
    }

    const children = incrementDeckTreeFlashcardCount(node.children, deckId);
    const didChildChange = children.some(
      (childNode, index) => childNode !== node.children[index],
    );

    return didChildChange
      ? { ...node, children, flashcardCount: node.flashcardCount + 1 }
      : node;
  });
}

/**
 * Merges the user's manually expanded decks with the decks a search forces open,
 * so matching nodes stay visible while a query is active.
 *
 * @example
 * getVisibleExpandedIds(new Set(["d1"]), filteredTree, "bio")
 */
export function getVisibleExpandedIds(
  expandedIds: Set<string>,
  filteredDeckTree: DeckTreeNode[],
  searchQuery: string,
): Set<string> {
  const visibleExpandedIds = new Set(expandedIds);
  const hasSearchQuery = searchQuery.trim().length > 0;
  const searchExpandedIds = hasSearchQuery
    ? getExpandedIdsForVisibleTree(filteredDeckTree)
    : new Set<string>();

  for (const deckId of searchExpandedIds) {
    visibleExpandedIds.add(deckId);
  }

  return visibleExpandedIds;
}
