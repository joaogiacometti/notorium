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
  description: string | null;
};

type DeleteDeckTarget = {
  id: string;
  name: string;
  flashcardCount: number;
};

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
  onToggle: (deckId: string) => void;
  onSelectDeck: (deckId?: string) => void;
  onCreateChild: (parentDeckId: string) => void;
  onEdit: (deck: EditDeckTarget) => void;
  onDelete: (deck: DeleteDeckTarget) => void;
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

function containsDeckId(nodes: DeckTreeNode[], deckId: string): boolean {
  return nodes.some(
    (node) => node.id === deckId || containsDeckId(node.children, deckId),
  );
}

function findDeckTreeNode(
  nodes: DeckTreeNode[],
  deckId: string,
): DeckTreeNode | null {
  for (const node of nodes) {
    if (node.id === deckId) {
      return node;
    }

    const match = findDeckTreeNode(node.children, deckId);
    if (match) {
      return match;
    }
  }

  return null;
}

interface DeckSidebarRowProps {
  children: ReactNode;
  currentView: FlashcardsView;
  deckId?: string;
  depth: number;
  isSelected: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  onSelect: () => void;
}

function DeckSidebarRow({
  children,
  depth,
  isSelected,
  leading,
  trailing,
  onSelect,
}: Readonly<DeckSidebarRowProps>) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-1 rounded-lg pr-1 text-left",
        isSelected
          ? "bg-primary/10 font-semibold text-primary"
          : "hover:bg-muted/70",
      )}
      style={{ paddingLeft: `${depth * 12}px` }}
    >
      {leading ?? <span className="size-7 shrink-0" aria-hidden />}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
        onClick={onSelect}
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
  onToggle,
  onSelectDeck,
  onCreateChild,
  onEdit,
  onDelete,
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
              description: node.description,
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
        leading={toggleButton}
        trailing={actionsMenu}
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
              onToggle={onToggle}
              onSelectDeck={onSelectDeck}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onDelete={onDelete}
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
  onSelectDeck: (deckId?: string) => void;
}

function SyntheticDeckTreeRootItem({
  node,
  currentView,
  selectedDeckId,
  loadingId,
  onSelectDeck,
}: Readonly<SyntheticDeckTreeRootItemProps>) {
  const isLoading = loadingId === "__root__";

  return (
    <DeckSidebarRow
      currentView={currentView}
      depth={0}
      isSelected={selectedDeckId === undefined}
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
  const [visibleDeckTree, setVisibleDeckTree] = useState(deckTree);
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
  const [editTarget, setEditTarget] = useState<EditDeckTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteDeckTarget | null>(
    null,
  );
  const allFlashcardsTotal = getTotalFlashcardsCount(visibleDeckTree);
  const rootNode: SyntheticDeckTreeRoot = {
    id: rootDeckId,
    name: "Flashcards",
    flashcardCount: allFlashcardsTotal,
  };

  useEffect(() => {
    setVisibleDeckTree(deckTree);
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

    const ancestorIds = getDeckAncestorIds(deckTree, selectedDeckId);
    const isTopLevelSelected = visibleDeckTree.some(
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
  }, [deckTree, selectedDeckId, visibleDeckTree]);

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
    router.refresh();
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

        <SyntheticDeckTreeRootItem
          node={rootNode}
          currentView={currentView}
          selectedDeckId={selectedDeckId}
          loadingId={isPendingVisible ? pendingDeckId : null}
          onSelectDeck={handleSelectDeck}
        />
        {visibleDeckTree.length === 0 ? (
          <div className="mt-1 rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
            Create your first deck to start organizing flashcards.
          </div>
        ) : (
          <div className="mt-1 space-y-1">
            {visibleDeckTree.map((childNode) => (
              <DeckTreeNodeItem
                key={childNode.id}
                node={childNode}
                depth={0}
                currentView={currentView}
                expandedIds={expandedIds}
                selectedDeckId={selectedDeckId}
                loadingId={isPendingVisible ? pendingDeckId : null}
                onToggle={handleToggle}
                onSelectDeck={handleSelectDeck}
                onCreateChild={(parentDeckId) => {
                  setCreateParentDeckId(parentDeckId);
                  setCreateOpen(true);
                }}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
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
          onSaved={() => {
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
          onDeleted={(deletedDeckId) => {
            const deletedDeckNode = findDeckTreeNode(
              visibleDeckTree,
              deletedDeckId,
            );
            const nextDeckTree = removeDeckTreeNode(
              visibleDeckTree,
              deletedDeckId,
            );
            setVisibleDeckTree(nextDeckTree);
            setDeleteTarget(null);

            if (
              selectedDeckId &&
              deletedDeckNode &&
              (selectedDeckId === deletedDeckId ||
                containsDeckId(deletedDeckNode.children, selectedDeckId))
            ) {
              router.replace(buildDeckViewHref(currentView));
            }

            refreshPage();
          }}
        />
      ) : null}
    </>
  );
}
