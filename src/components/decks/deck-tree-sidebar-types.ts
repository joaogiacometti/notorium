import type { ComponentType } from "react";
import type { FlashcardsView } from "@/features/flashcards/view";
import type { DeckTreeNode, FlashcardEntity } from "@/lib/server/api-contracts";

export interface DeckSidebarCreateFlashcardDialogProps {
  deckId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  aiEnabled: boolean;
}

export interface DeckTreeSidebarProps {
  deckTree: DeckTreeNode[];
  selectedDeckId?: string;
  currentView: FlashcardsView;
  aiEnabled: boolean;
  className?: string;
  CreateFlashcardDialogComponent?: ComponentType<DeckSidebarCreateFlashcardDialogProps>;
  onFlashcardCreated?: (flashcard: FlashcardEntity) => void;
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
