"use client";

import { Loader2 } from "lucide-react";
import { DeckSidebarRow } from "@/components/decks/deck-sidebar-row";
import type { SyntheticDeckTreeRoot } from "@/components/decks/deck-tree-sidebar-types";
import {
  loadingRootDeckId,
  rootDeckId,
} from "@/components/decks/deck-tree-sidebar-utils";
import { cn } from "@/lib/utils";

interface SyntheticDeckTreeRootItemProps {
  node: SyntheticDeckTreeRoot;
  selectedDeckId?: string;
  loadingId: string | null;
  draggedDeckId: string | null;
  dropTargetId: string | null;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onSelectDeck: (deckId?: string) => void;
}

export function SyntheticDeckTreeRootItem({
  node,
  selectedDeckId,
  loadingId,
  draggedDeckId,
  dropTargetId,
  onDragEnd,
  onDragOver,
  onDrop,
  onSelectDeck,
}: Readonly<SyntheticDeckTreeRootItemProps>) {
  const isLoading = loadingId === loadingRootDeckId;

  return (
    <DeckSidebarRow
      deckId={node.id}
      depth={0}
      isSelected={selectedDeckId === undefined}
      isDragging={draggedDeckId === rootDeckId}
      isDropTarget={dropTargetId === rootDeckId}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onSelect={() => onSelectDeck(undefined)}
    >
      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 truncate">
          {isLoading ? (
            <Loader2
              className="size-3.5 shrink-0 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : null}
          <span
            className={cn("truncate", isLoading ? "opacity-90" : undefined)}
          >
            {node.name}
          </span>
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {node.flashcardCount}
        </span>
      </span>
    </DeckSidebarRow>
  );
}
