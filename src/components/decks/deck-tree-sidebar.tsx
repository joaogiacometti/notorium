"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveDeck } from "@/app/actions/decks";
import { CreateDeckDialog } from "@/components/decks/create-deck-dialog";
import { DeckTreeList } from "@/components/decks/deck-tree-list";
import type {
  DeckTreeSidebarProps,
  DeleteDeckTarget,
  EditDeckTarget,
  SyntheticDeckTreeRoot,
} from "@/components/decks/deck-tree-sidebar-types";
import {
  buildDeckViewHref,
  getTotalFlashcardsCount,
  loadingRootDeckId,
  rootDeckId,
} from "@/components/decks/deck-tree-sidebar-utils";
import { DeleteDeckDialog } from "@/components/decks/delete-deck-dialog";
import { EditDeckDialog } from "@/components/decks/edit-deck-dialog";
import { SyntheticDeckTreeRootItem } from "@/components/decks/synthetic-deck-tree-root-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";
import type { DeckEntity, DeckTreeNode } from "@/lib/server/api-contracts";
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
  const visibleExpandedIds = getVisibleExpandedIds(
    expandedIds,
    filteredDeckTree,
    searchQuery,
  );
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
    const activeDeckId = selectedDeckId ?? loadingRootDeckId;
    if (pendingDeckId === activeDeckId) {
      setPendingDeckId(null);
    }
  }, [selectedDeckId, pendingDeckId]);

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

  function refreshPage() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleSelectDeck(deckId?: string) {
    const targetId = deckId ?? loadingRootDeckId;
    if (targetId === (selectedDeckId ?? loadingRootDeckId)) {
      return;
    }

    if (pendingDeckId !== null) {
      return;
    }

    setPendingDeckId(targetId);
    startTransition(() => {
      router.replace(buildDeckViewHref(currentView, deckId));
    });
  }

  function handleDeckCreated(deck: DeckEntity) {
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

          <DeckTreeList
            filteredDeckTree={filteredDeckTree}
            searchQuery={searchQuery}
            visibleExpandedIds={visibleExpandedIds}
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

function getVisibleExpandedIds(
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
