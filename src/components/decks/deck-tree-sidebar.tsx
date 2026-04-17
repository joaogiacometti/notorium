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
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveDeck } from "@/app/actions/decks";
import { CreateDeckDialog } from "@/components/decks/create-deck-dialog";
import { DeleteDeckDialog } from "@/components/decks/delete-deck-dialog";
import { EditDeckDialog } from "@/components/decks/edit-deck-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlashcardsView } from "@/features/flashcards/view";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";
import type { DeckTreeNode } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

interface DeckTreeSidebarProps {
  deckTree: DeckTreeNode[];
  selectedDeckId?: string;
  currentView: FlashcardsView;
}

const rootDeckId = "__flashcards_root__";

type EditDeckTarget = {
  id: string;
  name: string;
};

type DeleteDeckTarget = {
  id: string;
  name: string;
  flashcardCount: number;
};

function normalizeDeckTree(
  nodes: DeckTreeNode[],
  parentPath?: string,
): DeckTreeNode[] {
  return nodes.map((node) => {
    const normalizedChildren = normalizeDeckTree(
      node.children,
      parentPath ? `${parentPath}::${node.name}` : node.name,
    );
    const previousChildCount = node.children.reduce(
      (total, childNode) => total + childNode.flashcardCount,
      0,
    );
    const directFlashcardCount = node.flashcardCount - previousChildCount;
    const nextPath = parentPath ? `${parentPath}::${node.name}` : node.name;
    const nextFlashcardCount =
      directFlashcardCount +
      normalizedChildren.reduce(
        (total, childNode) => total + childNode.flashcardCount,
        0,
      );

    return {
      ...node,
      children: normalizedChildren,
      path: nextPath,
      flashcardCount: nextFlashcardCount,
    };
  });
}

function updateDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
  updater: (node: DeckTreeNode) => DeckTreeNode,
): DeckTreeNode[] {
  return nodes.map((node) => {
    const nextNode =
      node.id === deckId
        ? updater(node)
        : {
            ...node,
          };

    return {
      ...nextNode,
      children: updateDeckTreeNode(nextNode.children, deckId, updater),
    };
  });
}

function removeDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
): DeckTreeNode[] {
  return nodes
    .filter((node) => node.id !== deckId)
    .map((node) => ({
      ...node,
      children: removeDeckTreeNode(node.children, deckId),
    }));
}

function findDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
): DeckTreeNode | null {
  for (const node of nodes) {
    if (node.id === deckId) {
      return node;
    }

    const childMatch = findDeckTreeNode(node.children, deckId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function isDeckDescendant(
  nodes: DeckTreeNode[],
  ancestorId: string,
  targetId: string,
): boolean {
  const ancestor = findDeckTreeNode(nodes, ancestorId);
  if (!ancestor) {
    return false;
  }

  return findDeckTreeNode(ancestor.children, targetId) !== null;
}

function extractDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
): {
  nextNodes: DeckTreeNode[];
  removedNode: DeckTreeNode | null;
} {
  let removedNode: DeckTreeNode | null = null;
  const nextNodes: DeckTreeNode[] = [];

  for (const node of nodes) {
    if (node.id === deckId) {
      removedNode = node;
      continue;
    }

    const extractedChild = extractDeckTreeNode(node.children, deckId);
    if (extractedChild.removedNode) {
      removedNode = extractedChild.removedNode;
      nextNodes.push({
        ...node,
        children: extractedChild.nextNodes,
      });
      continue;
    }

    nextNodes.push(node);
  }

  return {
    nextNodes,
    removedNode,
  };
}

function sortDeckTreeNodes(nodes: DeckTreeNode[]): DeckTreeNode[] {
  return [...nodes].sort((left, right) => left.name.localeCompare(right.name));
}

function insertDeckTreeNode(
  nodes: DeckTreeNode[],
  nodeToInsert: DeckTreeNode,
  parentDeckId: string | null,
): DeckTreeNode[] {
  if (parentDeckId === null) {
    return sortDeckTreeNodes([
      ...nodes,
      {
        ...nodeToInsert,
        parentDeckId: null,
      },
    ]);
  }

  return nodes.map((node) => {
    if (node.id === parentDeckId) {
      return {
        ...node,
        children: sortDeckTreeNodes([
          ...node.children,
          {
            ...nodeToInsert,
            parentDeckId,
          },
        ]),
      };
    }

    return {
      ...node,
      children: insertDeckTreeNode(node.children, nodeToInsert, parentDeckId),
    };
  });
}

function moveDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
  parentDeckId: string | null,
): DeckTreeNode[] {
  const extracted = extractDeckTreeNode(nodes, deckId);
  if (!extracted.removedNode) {
    return nodes;
  }

  return normalizeDeckTree(
    insertDeckTreeNode(
      extracted.nextNodes,
      extracted.removedNode,
      parentDeckId,
    ),
  );
}

function buildDeckViewHref(view: FlashcardsView, deckId?: string) {
  const params = new URLSearchParams();
  params.set("view", view);

  if (deckId) {
    params.set("deckId", deckId);
  }

  return `/flashcards?${params.toString()}`;
}

interface DeckTreeNodeItemProps {
  node: DeckTreeNode;
  depth: number;
  currentView: FlashcardsView;
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

interface SyntheticDeckTreeRoot {
  id: string;
  name: string;
  flashcardCount: number;
}

function getTotalFlashcardsCount(nodes: DeckTreeNode[]): number {
  return nodes.reduce((total, node) => total + node.flashcardCount, 0);
}

function getDeckAncestorIds(nodes: DeckTreeNode[], deckId: string): string[] {
  for (const node of nodes) {
    if (node.id === deckId) {
      return [];
    }

    const childAncestors = getDeckAncestorIds(node.children, deckId);
    if (
      childAncestors.length > 0 ||
      node.children.some((child) => child.id === deckId)
    ) {
      return [node.id, ...childAncestors];
    }
  }

  return [];
}

interface DeckSidebarRowProps {
  children: ReactNode;
  currentView: FlashcardsView;
  deckId?: string;
  depth: number;
  isSelected: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  draggable?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  onDragEnd?: () => void;
  onDragOver?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  onSelect: () => void;
}

function DeckSidebarRow({
  children,
  deckId,
  depth,
  isSelected,
  isDragging,
  isDropTarget,
  draggable,
  leading,
  trailing,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onSelect,
}: Readonly<DeckSidebarRowProps>) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-1 rounded-lg pr-1 text-left transition-opacity",
        isSelected
          ? "bg-primary/10 font-semibold text-primary"
          : "hover:bg-muted/70",
        isDropTarget ? "bg-muted/70 ring-1 ring-border" : undefined,
        isDragging ? "opacity-60" : undefined,
      )}
      style={{ paddingLeft: `${depth * 12}px` }}
    >
      {leading ?? <span className="size-7 shrink-0" aria-hidden />}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
        data-deck-id={deckId}
        data-deck-row="true"
        draggable={draggable}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOver?.();
        }}
        onDragStart={onDragStart}
        onClick={onSelect}
        onDrop={(event) => {
          event.preventDefault();
          onDrop?.();
        }}
      >
        {children}
      </button>
      {trailing ?? <span className="size-7 shrink-0" aria-hidden />}
    </div>
  );
}

function DeckTreeNodeItem({
  node,
  depth,
  currentView,
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
  const toggleButton = hasChildren ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      onClick={() => onToggle(node.id)}
      aria-label={isExpanded ? "Collapse deck" : "Expand deck"}
    >
      {isExpanded ? (
        <ChevronDown className="size-4" />
      ) : (
        <ChevronRight className="size-4" />
      )}
    </Button>
  ) : (
    <span className="size-7 shrink-0" aria-hidden />
  );
  const actionsMenu = (
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

  return (
    <div className="space-y-1">
      <DeckSidebarRow
        currentView={currentView}
        deckId={node.id}
        depth={depth}
        isSelected={isSelected}
        isDragging={draggedDeckId === node.id}
        isDropTarget={dropTargetId === node.id}
        draggable
        leading={toggleButton}
        trailing={actionsMenu}
        onDragEnd={onDragEnd}
        onDragOver={() => onDragTarget(node.id)}
        onDragStart={() => onDragStart(node.id)}
        onDrop={() => onDropTarget(node.id)}
        onSelect={() => onSelectDeck(node.id)}
      >
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
        <span className="shrink-0 text-xs text-muted-foreground">
          {node.flashcardCount}
        </span>
      </DeckSidebarRow>
      {hasChildren && isExpanded ? (
        <div className="space-y-1">
          {node.children.map((childNode) => (
            <DeckTreeNodeItem
              key={childNode.id}
              node={childNode}
              depth={depth + 1}
              currentView={currentView}
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

interface SyntheticDeckTreeRootItemProps {
  node: SyntheticDeckTreeRoot;
  currentView: FlashcardsView;
  selectedDeckId?: string;
  loadingId: string | null;
  draggedDeckId: string | null;
  dropTargetId: string | null;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onSelectDeck: (deckId?: string) => void;
}

function SyntheticDeckTreeRootItem({
  node,
  currentView,
  selectedDeckId,
  loadingId,
  draggedDeckId,
  dropTargetId,
  onDragEnd,
  onDragOver,
  onDrop,
  onSelectDeck,
}: Readonly<SyntheticDeckTreeRootItemProps>) {
  const isLoading = loadingId === "__root__";

  return (
    <DeckSidebarRow
      currentView={currentView}
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
        <span className="shrink-0 text-xs text-muted-foreground">
          {node.flashcardCount}
        </span>
      </span>
    </DeckSidebarRow>
  );
}

export function DeckTreeSidebar({
  deckTree,
  selectedDeckId,
  currentView,
}: Readonly<DeckTreeSidebarProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localDeckTree, setLocalDeckTree] = useState<DeckTreeNode[]>(deckTree);
  const [pendingDeckId, setPendingDeckId] = useState<string | null>(null);
  const [pendingMoveDeckId, setPendingMoveDeckId] = useState<string | null>(
    null,
  );
  const [draggedDeckId, setDraggedDeckId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const isPendingVisible = useSmoothedLoadingState(pendingDeckId !== null, {
    delayMs: 0,
    minimumVisibleMs: 180,
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [createParentDeckId, setCreateParentDeckId] = useState<
    string | undefined
  >(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditDeckTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteDeckTarget | null>(
    null,
  );
  const allFlashcardsTotal = getTotalFlashcardsCount(localDeckTree);
  const rootNode: SyntheticDeckTreeRoot = {
    id: rootDeckId,
    name: "All Decks",
    flashcardCount: allFlashcardsTotal,
  };
  const loadingId =
    pendingMoveDeckId ?? (isPendingVisible ? pendingDeckId : null);

  useEffect(() => {
    setLocalDeckTree(deckTree);
  }, [deckTree]);

  useEffect(() => {
    const activeDeckId = selectedDeckId ?? "__root__";
    if (pendingDeckId === activeDeckId) {
      setPendingDeckId(null);
    }
  }, [selectedDeckId, pendingDeckId]);

  function handleSelectDeck(deckId?: string) {
    const targetId = deckId ?? "__root__";
    if (targetId === (selectedDeckId ?? "__root__") || pendingDeckId !== null) {
      return;
    }

    setPendingDeckId(targetId);
    startTransition(() => {
      router.replace(buildDeckViewHref(currentView, deckId));
    });
  }

  useEffect(() => {
    if (!selectedDeckId) {
      return;
    }

    const ancestorIds = getDeckAncestorIds(localDeckTree, selectedDeckId);
    const isTopLevelSelected = localDeckTree.some(
      (node) => node.id === selectedDeckId,
    );

    if (ancestorIds.length === 0 && !isTopLevelSelected) {
      return;
    }

    setExpandedIds((current) => {
      const next = new Set(current);

      for (const ancestorId of ancestorIds) {
        next.add(ancestorId);
      }

      return next;
    });
  }, [localDeckTree, selectedDeckId]);

  function handleToggle(deckId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(deckId)) {
        next.delete(deckId);
      } else {
        next.add(deckId);
      }

      return next;
    });
  }

  function refreshPage() {
    startTransition(() => {
      router.refresh();
    });
  }

  function getProposedParentDeckId(targetId: string): string | null {
    return targetId === rootDeckId ? null : targetId;
  }

  function canDropDeck(sourceDeckId: string | null, targetId: string): boolean {
    if (!sourceDeckId) {
      return false;
    }

    const sourceNode = findDeckTreeNode(localDeckTree, sourceDeckId);
    if (!sourceNode) {
      return false;
    }

    const proposedParentDeckId = getProposedParentDeckId(targetId);

    if (proposedParentDeckId === sourceDeckId) {
      return false;
    }

    if (proposedParentDeckId === sourceNode.parentDeckId) {
      return false;
    }

    if (
      proposedParentDeckId !== null &&
      isDeckDescendant(localDeckTree, sourceDeckId, proposedParentDeckId)
    ) {
      return false;
    }

    return true;
  }

  function clearDragState() {
    setDraggedDeckId(null);
    setDropTargetId(null);
  }

  function handleDragStart(deckId: string) {
    if (pendingMoveDeckId !== null) {
      return;
    }

    setDraggedDeckId(deckId);
    setDropTargetId(null);
  }

  function handleDragTarget(targetId: string) {
    if (pendingMoveDeckId !== null) {
      return;
    }

    if (!canDropDeck(draggedDeckId, targetId)) {
      if (dropTargetId === targetId) {
        setDropTargetId(null);
      }
      return;
    }

    setDropTargetId(targetId);
  }

  async function handleDropTarget(targetId: string) {
    if (pendingMoveDeckId !== null || !draggedDeckId) {
      clearDragState();
      return;
    }

    if (!canDropDeck(draggedDeckId, targetId)) {
      clearDragState();
      return;
    }

    const proposedParentDeckId = getProposedParentDeckId(targetId);
    const deckId = draggedDeckId;

    setPendingMoveDeckId(deckId);
    clearDragState();

    const result = await moveDeck(
      proposedParentDeckId === null
        ? { id: deckId }
        : { id: deckId, parentDeckId: proposedParentDeckId },
    );

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      setPendingMoveDeckId(null);
      return;
    }

    setLocalDeckTree((current) =>
      moveDeckTreeNode(current, deckId, proposedParentDeckId),
    );
    setExpandedIds((current) => {
      const next = new Set(current);
      if (proposedParentDeckId !== null) {
        next.add(proposedParentDeckId);
      }
      return next;
    });
    setPendingMoveDeckId(null);
    refreshPage();
  }

  return (
    <>
      <aside className="rounded-2xl border border-border/70 bg-card/85 p-3 shadow-none lg:sticky lg:top-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Decks</p>
          <CreateDeckDialog
            trigger={
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateParentDeckId(undefined)}
              >
                <Plus className="size-4" />
                New Deck
              </Button>
            }
            open={createOpen}
            onOpenChange={setCreateOpen}
            parentDeckId={createParentDeckId}
            onCreated={refreshPage}
          />
        </div>

        <div className="space-y-3">
          <div data-testid="deck-tree-root-scope">
            <SyntheticDeckTreeRootItem
              node={rootNode}
              currentView={currentView}
              selectedDeckId={selectedDeckId}
              loadingId={loadingId}
              draggedDeckId={draggedDeckId}
              dropTargetId={dropTargetId}
              onDragEnd={clearDragState}
              onDragOver={() => handleDragTarget(rootDeckId)}
              onDrop={() => void handleDropTarget(rootDeckId)}
              onSelectDeck={handleSelectDeck}
            />
          </div>
          <div
            className="border-t border-border/70"
            data-testid="deck-tree-root-divider"
          />
        </div>
        {localDeckTree.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
            Create your first deck to start organizing flashcards.
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            {localDeckTree.map((childNode) => (
              <DeckTreeNodeItem
                key={childNode.id}
                node={childNode}
                depth={0}
                currentView={currentView}
                expandedIds={expandedIds}
                selectedDeckId={selectedDeckId}
                loadingId={loadingId}
                draggedDeckId={draggedDeckId}
                dropTargetId={dropTargetId}
                onToggle={handleToggle}
                onSelectDeck={handleSelectDeck}
                onCreateChild={(parentDeckId) => {
                  setCreateParentDeckId(parentDeckId);
                  setCreateOpen(true);
                }}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onDragEnd={clearDragState}
                onDragStart={handleDragStart}
                onDragTarget={handleDragTarget}
                onDropTarget={(targetId) => {
                  void handleDropTarget(targetId);
                }}
              />
            ))}
          </div>
        )}
      </aside>

      {editTarget ? (
        <EditDeckDialog
          deck={editTarget}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
          onSaved={(deck) => {
            setLocalDeckTree((current) =>
              normalizeDeckTree(
                updateDeckTreeNode(current, deck.id, (node) => ({
                  ...node,
                  name: deck.name,
                  updatedAt: deck.updatedAt,
                })),
              ),
            );
            setEditTarget(null);
            refreshPage();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteDeckDialog
          deckId={deleteTarget.id}
          deckName={deleteTarget.name}
          flashcardCount={deleteTarget.flashcardCount}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          onDeleted={(deckId) => {
            setLocalDeckTree((current) =>
              normalizeDeckTree(removeDeckTreeNode(current, deckId)),
            );
            setDeleteTarget(null);
            refreshPage();
          }}
        />
      ) : null}
    </>
  );
}
