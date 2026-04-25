"use client";

import {
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { DeckSidebarRow } from "@/components/decks/deck-sidebar-row";
import type {
  DeleteDeckTarget,
  EditDeckTarget,
} from "@/components/decks/deck-tree-sidebar-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeckTreeNode } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface DeckTreeNodeItemProps {
  node: DeckTreeNode;
  depth: number;
  expandedIds: Set<string>;
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

export function DeckTreeNodeItem({
  node,
  depth,
  expandedIds,
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
}: Readonly<DeckTreeNodeItemProps>) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedDeckId === node.id;
  const isLoading = loadingId === node.id;

  return (
    <div className="space-y-1">
      <DeckSidebarRow
        deckId={node.id}
        depth={depth}
        isSelected={isSelected}
        isDragging={draggedDeckId === node.id}
        isDropTarget={dropTargetId === node.id}
        draggable
        leading={
          <DeckExpandButton
            deckId={node.id}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            onToggle={onToggle}
          />
        }
        trailing={
          <DeckActionsMenu
            node={node}
            onCreateChild={onCreateChild}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        }
        onDragEnd={onDragEnd}
        onDragOver={() => onDragTarget(node.id)}
        onDragStart={() => onDragStart(node.id)}
        onDrop={() => onDropTarget(node.id)}
        onSelect={() => onSelectDeck(node.id)}
      >
        <DeckNodeLabel node={node} isLoading={isLoading} />
      </DeckSidebarRow>
      {hasChildren && isExpanded ? (
        <div className="space-y-1">
          {node.children.map((childNode) => (
            <DeckTreeNodeItem
              key={childNode.id}
              node={childNode}
              depth={depth + 1}
              expandedIds={expandedIds}
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
      ) : null}
    </div>
  );
}

interface DeckExpandButtonProps {
  deckId: string;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: (deckId: string) => void;
}

function DeckExpandButton({
  deckId,
  hasChildren,
  isExpanded,
  onToggle,
}: Readonly<DeckExpandButtonProps>) {
  if (!hasChildren) {
    return <span className="size-7 shrink-0" aria-hidden />;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      onClick={(event) => {
        event.stopPropagation();
        onToggle(deckId);
      }}
      aria-label={isExpanded ? "Collapse deck" : "Expand deck"}
    >
      {isExpanded ? (
        <ChevronDown className="size-4" />
      ) : (
        <ChevronRight className="size-4" />
      )}
    </Button>
  );
}

interface DeckActionsMenuProps {
  node: DeckTreeNode;
  onCreateChild: (parentDeckId: string) => void;
  onEdit: (deck: EditDeckTarget) => void;
  onDelete: (deck: DeleteDeckTarget) => void;
}

function DeckActionsMenu({
  node,
  onCreateChild,
  onEdit,
  onDelete,
}: Readonly<DeckActionsMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Deck actions"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onCreateChild(node.id)}>
          <Plus className="size-4" />
          Create sub-deck
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onEdit({
              id: node.id,
              name: node.name,
            })
          }
        >
          <Pencil className="size-4" />
          Rename deck
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() =>
            onDelete({
              id: node.id,
              name: node.path,
              flashcardCount: node.flashcardCount,
            })
          }
        >
          <Trash2 className="size-4" />
          Delete deck
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeckNodeLabel({
  node,
  isLoading,
}: Readonly<{ node: DeckTreeNode; isLoading: boolean }>) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2 truncate">
        {isLoading ? (
          <Loader2
            className="size-3.5 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
        <span
          className={cn("truncate", isLoading ? "opacity-90" : undefined)}
          title={node.path}
        >
          {node.name}
        </span>
      </span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
        {node.flashcardCount}
      </span>
    </>
  );
}
