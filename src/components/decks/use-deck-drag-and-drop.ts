"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { moveDeck } from "@/app/actions/decks";
import { rootDeckId } from "@/components/decks/deck-tree-sidebar-utils";
import type { DeckTreeNode } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import { findDeckTreeNode, isDeckDescendant } from "@/lib/trees/deck-tree";

interface UseDeckDragAndDropParams {
  localDeckTree: DeckTreeNode[];
  onDeckMoved: (deckId: string, proposedParentDeckId: string | null) => void;
}

// The synthetic root maps to "no parent"; every other target reparents under it.
function getProposedParentDeckId(targetId: string): string | null {
  return targetId === rootDeckId ? null : targetId;
}

/**
 * Owns deck tree drag-and-drop: hover/drop target tracking, drop validity, and
 * the move server action. On success it delegates tree mutation to `onDeckMoved`
 * so the sidebar stays the single owner of its local tree and expansion state.
 *
 * @example
 * const dnd = useDeckDragAndDrop({
 *   localDeckTree,
 *   onDeckMoved: (deckId, parentId) => applyMoveToTree(deckId, parentId),
 * });
 */
export function useDeckDragAndDrop({
  localDeckTree,
  onDeckMoved,
}: UseDeckDragAndDropParams) {
  const [draggedDeckId, setDraggedDeckId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [pendingMoveDeckId, setPendingMoveDeckId] = useState<string | null>(
    null,
  );
  const draggedDeckIdRef = useRef<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

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

    onDeckMoved(deckId, proposedParentDeckId);
    setPendingMoveDeckId(null);
  }

  return {
    draggedDeckId,
    dropTargetId,
    pendingMoveDeckId,
    clearDragState,
    handleDragStart,
    handleDragTarget,
    handleDropTarget,
  };
}
