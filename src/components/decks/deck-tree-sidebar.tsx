"use client";

import {
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import type { FlashcardsView } from "@/features/flashcards/view";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";
import type { DeckTreeNode } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import {
  filterDeckTree,
  findDeckTreeNode,
  getDeckAncestorIds,
  getExpandedIdsForVisibleTree,
  insertDeckTreeNode,
  isDeckDescendant,
  moveDeckTreeNode,
  normalizeDeckTree,
  removeDeckTreeNode,
  updateDeckTreeNode,
} from "@/lib/trees/deck-tree";
import { cn } from "@/lib/utils";

interface DeckTreeSidebarProps {
  deckTree: DeckTreeNode[];
  selectedDeckId?: string;
  currentView: FlashcardsView;
  onDeckDeleted?: (deckId: string) => void;
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

function buildDeckViewHref(view: FlashcardsView, deckId?: string) {
  const params = new URLSearchParams();
  params.set("view", view);

  if (deckId) {
    params.set("deckId", deckId);
  }

  return `/flashcards?${params.toString()}`;
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
        "group flex w-full items-center gap-1 rounded-xl pr-1 text-left transition-[opacity,background-color,color,box-shadow]",
        isSelected
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
        isDropTarget
          ? "bg-background ring-1 ring-[color:var(--intent-info-border)]"
          : undefined,
        isDragging ? "opacity-50" : undefined,
      )}
      style={{ paddingLeft: `${depth * 12}px` }}
    >
      {leading ?? <span className="size-7 shrink-0" aria-hidden />}
      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm",
          isSelected ? "font-medium" : undefined,
        )}
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
      onClick={(event) => {
        event.stopPropagation();
        onToggle(node.id);
      }}
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
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
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
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
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
  onDeckDeleted,
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
  const draggedDeckIdRef = useRef<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

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
  const [searchQuery, setSearchQuery] = useState("");
  const allFlashcardsTotal = getTotalFlashcardsCount(localDeckTree);
  const filteredDeckTree = filterDeckTree(localDeckTree, searchQuery);
  const hasSearchQuery = searchQuery.trim().length > 0;
  const searchExpandedIds = hasSearchQuery
    ? getExpandedIdsForVisibleTree(filteredDeckTree)
    : new Set<string>();
  const visibleExpandedIds = new Set(expandedIds);

  for (const deckId of searchExpandedIds) {
    visibleExpandedIds.add(deckId);
  }

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

  function handleDeckCreated(
    deck: import("@/lib/server/api-contracts").DeckEntity,
  ) {
    const newNode: DeckTreeNode = {
      ...deck,
      flashcardCount: 0,
      children: [],
      path: deck.parentDeckId
        ? `${findDeckTreeNode(localDeckTree, deck.parentDeckId)?.path ?? deck.parentDeckId}::${deck.name}`
        : deck.name,
    };
    setLocalDeckTree((current) =>
      normalizeDeckTree(
        insertDeckTreeNode(current, newNode, deck.parentDeckId ?? null),
      ),
    );
    refreshPage();
  }

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
    draggedDeckIdRef.current = null;
    dropTargetIdRef.current = null;
    setDraggedDeckId(null);
    setDropTargetId(null);
  }

  function handleDragStart(deckId: string) {
    if (pendingMoveDeckId !== null) {
      return;
    }

    draggedDeckIdRef.current = deckId;
    dropTargetIdRef.current = null;
    setDraggedDeckId(deckId);
    setDropTargetId(null);
  }

  function handleDragTarget(targetId: string) {
    if (pendingMoveDeckId !== null) {
      return;
    }

    if (!canDropDeck(draggedDeckIdRef.current, targetId)) {
      if (dropTargetIdRef.current === targetId) {
        dropTargetIdRef.current = null;
        setDropTargetId(null);
      }
      return;
    }

    if (dropTargetIdRef.current === targetId) {
      return;
    }

    dropTargetIdRef.current = targetId;
    setDropTargetId(targetId);
  }

  async function handleDropTarget(targetId: string) {
    if (pendingMoveDeckId !== null || !draggedDeckIdRef.current) {
      clearDragState();
      return;
    }

    if (!canDropDeck(draggedDeckIdRef.current, targetId)) {
      clearDragState();
      return;
    }

    const proposedParentDeckId = getProposedParentDeckId(targetId);
    const deckId = draggedDeckIdRef.current;

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
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Decks</p>
          <CreateDeckDialog
            trigger={
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setCreateParentDeckId(undefined)}
              >
                <Plus className="size-4" />
                New Deck
              </Button>
            }
            open={createOpen}
            onOpenChange={setCreateOpen}
            parentDeckId={createParentDeckId}
            onCreated={handleDeckCreated}
          />
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 rounded-lg border-border/70 bg-background pl-10 pr-4 shadow-xs"
          />
        </div>

        <div className="mt-4 space-y-1">
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
            className="mt-3 border-t border-border/60 pt-3"
            data-testid="deck-tree-section-divider"
          >
            <p className="px-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              My Decks
            </p>
          </div>

          {filteredDeckTree.length === 0 && !searchQuery ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-background/80 px-3 py-5 text-center text-sm text-muted-foreground">
              Create your first deck to start organizing flashcards.
            </div>
          ) : filteredDeckTree.length === 0 && searchQuery ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-background/80 px-3 py-5 text-center text-sm text-muted-foreground">
              No decks match your search.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDeckTree.map((childNode) => (
                <DeckTreeNodeItem
                  key={childNode.id}
                  node={childNode}
                  depth={0}
                  currentView={currentView}
                  expandedIds={visibleExpandedIds}
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
        </div>
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
            onDeckDeleted?.(deckId);
            refreshPage();
          }}
        />
      ) : null}
    </>
  );
}
