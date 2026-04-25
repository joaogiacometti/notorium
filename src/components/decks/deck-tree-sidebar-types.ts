import type { FlashcardsView } from "@/features/flashcards/view";
import type { DeckTreeNode } from "@/lib/server/api-contracts";

export interface DeckTreeSidebarProps {
  deckTree: DeckTreeNode[];
  selectedDeckId?: string;
  currentView: FlashcardsView;
  onDeckDeleted?: (deckId: string) => void;
}

export type EditDeckTarget = {
  id: string;
  name: string;
};

export type DeleteDeckTarget = {
  id: string;
  name: string;
  flashcardCount: number;
};

export interface SyntheticDeckTreeRoot {
  id: string;
  name: string;
  flashcardCount: number;
}
