"use client";

import { DeckTreeNodeItem } from "@/components/decks/deck-tree-node-item";
import type {
  DeleteDeckTarget,
  EditDeckTarget,
} from "@/components/decks/deck-tree-sidebar-types";
import type { DeckTreeNode } from "@/lib/server/api-contracts";

interface DeckTreeListProps {
  filteredDeckTree: DeckTreeNode[];
  searchQuery: string;
  visibleExpandedIds: Set<string>;
  selectedDeckId?: string;
  loadingId: string | null;
  draggedDeckId: string | null;
  dropTargetId: string | null;
  onToggle: (deckId: string) => void;
  onSelectDeck: (deckId?: string) => void;
  onCreateChild: (parentDeckId: string) => void;
  onEdit: (deck: EditDeckTarget) => void;
  onDelete: (deck: DeleteDeckTarget) => void;
  onDragEnd: () => void;
  onDragStart: (deckId: string) => void;
  onDragTarget: (targetId: string) => void;
  onDropTarget: (targetId: string) => void;
}

export function DeckTreeList({
  filteredDeckTree,
  searchQuery,
  visibleExpandedIds,
  selectedDeckId,
  loadingId,
  draggedDeckId,
  dropTargetId,
  onToggle,
  onSelectDeck,
  onCreateChild,
  onEdit,
  onDelete,
  onDragEnd,
  onDragStart,
  onDragTarget,
  onDropTarget,
}: Readonly<DeckTreeListProps>) {
  if (filteredDeckTree.length === 0 && !searchQuery) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-background/80 px-3 py-5 text-center text-sm text-muted-foreground">
        Create your first deck to start organizing flashcards.
      </div>
    );
  }

  if (filteredDeckTree.length === 0 && searchQuery) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-background/80 px-3 py-5 text-center text-sm text-muted-foreground">
        No decks match your search.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredDeckTree.map((childNode) => (
        <DeckTreeNodeItem
          key={childNode.id}
          node={childNode}
          depth={0}
          expandedIds={visibleExpandedIds}
          selectedDeckId={selectedDeckId}
          loadingId={loadingId}
          draggedDeckId={draggedDeckId}
          dropTargetId={dropTargetId}
          onToggle={onToggle}
          onSelectDeck={onSelectDeck}
          onCreateChild={onCreateChild}
          onEdit={onEdit}
          onDelete={onDelete}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          onDragTarget={onDragTarget}
          onDropTarget={onDropTarget}
        />
      ))}
    </div>
  );
}
