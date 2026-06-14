"use client";

import { FolderPlus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  getVisibleExpandedIds,
  incrementDeckTreeFlashcardCount,
  loadingRootDeckId,
  rootDeckId,
} from "@/components/decks/deck-tree-sidebar-utils";
import { DeleteDeckDialog } from "@/components/decks/delete-deck-dialog";
import { EditDeckDialog } from "@/components/decks/edit-deck-dialog";
import { SyntheticDeckTreeRootItem } from "@/components/decks/synthetic-deck-tree-root-item";
import { useDeckDragAndDrop } from "@/components/decks/use-deck-drag-and-drop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";
import type {
  DeckEntity,
  DeckTreeNode,
  FlashcardEntity,
} from "@/lib/server/api-contracts";
import {
  filterDeckTree,
  findDeckTreeNode,
  getDeckAncestorIds,
  insertDeckTreeNode,
  moveDeckTreeNode,
  normalizeDeckTree,
  removeDeckTreeNode,
  updateDeckTreeNode,
} from "@/lib/trees/deck-tree";
import { cn } from "@/lib/utils";

export function DeckTreeSidebar({
  deckTree,
  selectedDeckId,
  currentView,
  aiEnabled,
  className,
  CreateFlashcardDialogComponent,
  onFlashcardCreated,
  onDeckDeleted,
}: Readonly<DeckTreeSidebarProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localDeckTree, setLocalDeckTree] = useState<DeckTreeNode[]>(deckTree);
  const [pendingDeckId, setPendingDeckId] = useState<string | null>(null);

  const isPendingVisible = useSmoothedLoadingState(pendingDeckId !== null, {
    delayMs: 0,
    minimumVisibleMs: 180,
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [createParentDeckId, setCreateParentDeckId] = useState<
    string | undefined
  >(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFlashcardDeckId, setCreateFlashcardDeckId] = useState<
    string | null
  >(null);
  const [editTarget, setEditTarget] = useState<EditDeckTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteDeckTarget | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const {
    draggedDeckId,
    dropTargetId,
    pendingMoveDeckId,
    clearDragState,
    handleDragStart,
    handleDragTarget,
    handleDropTarget,
  } = useDeckDragAndDrop({
    localDeckTree,
    onDeckMoved: (deckId, proposedParentDeckId) => {
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
      refreshPage();
    },
  });

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

  function handleFlashcardCreated(deckId: string, flashcard: FlashcardEntity) {
    setLocalDeckTree((current) =>
      incrementDeckTreeFlashcardCount(current, deckId),
    );
    onFlashcardCreated?.(flashcard);
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

  return (
    <>
      <aside
        className={cn(
          "rounded-2xl border border-border/70 bg-card/85 p-3 shadow-none lg:sticky lg:top-0 lg:h-full lg:min-h-0 lg:overflow-y-auto",
          className,
        )}
      >
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
                <FolderPlus className="size-4" />
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
            onCreateFlashcard={setCreateFlashcardDeckId}
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

      {CreateFlashcardDialogComponent ? (
        <CreateFlashcardDialogComponent
          open={createFlashcardDeckId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCreateFlashcardDeckId(null);
            }
          }}
          onCreated={(flashcard) => {
            if (createFlashcardDeckId) {
              handleFlashcardCreated(createFlashcardDeckId, flashcard);
            }
          }}
          deckId={createFlashcardDeckId ?? undefined}
          aiEnabled={aiEnabled}
        />
      ) : null}
    </>
  );
}
