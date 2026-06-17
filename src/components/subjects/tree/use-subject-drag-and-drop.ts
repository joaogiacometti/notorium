"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { moveSubject } from "@/app/actions/subjects";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import {
  findSubjectTreeNode,
  isSubjectDescendant,
} from "@/lib/trees/subject-tree";

/** Drop target id for the synthetic "top level" zone (reparents to no parent). */
export const SUBJECT_TREE_ROOT_ID = "__subject_tree_root__";

interface UseSubjectDragAndDropParams {
  localTree: SubjectTreeNode[];
  onSubjectMoved: (
    subjectId: string,
    proposedParentSubjectId: string | null,
  ) => void;
}

// The synthetic root maps to "no parent"; every other target reparents under it.
function getProposedParentSubjectId(targetId: string): string | null {
  return targetId === SUBJECT_TREE_ROOT_ID ? null : targetId;
}

/**
 * Owns subject tree drag-and-drop: hover/drop target tracking, drop validity,
 * and the move server action. On success it delegates tree mutation to
 * `onSubjectMoved` so the sidebar stays the single owner of its local tree.
 *
 * @example
 * const dnd = useSubjectDragAndDrop({
 *   localTree,
 *   onSubjectMoved: (id, parentId) => applyMove(id, parentId),
 * });
 */
export function useSubjectDragAndDrop({
  localTree,
  onSubjectMoved,
}: UseSubjectDragAndDropParams) {
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [pendingMoveSubjectId, setPendingMoveSubjectId] = useState<
    string | null
  >(null);
  const draggedSubjectIdRef = useRef<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

  function canDrop(sourceSubjectId: string | null, targetId: string): boolean {
    if (!sourceSubjectId) {
      return false;
    }

    const sourceNode = findSubjectTreeNode(localTree, sourceSubjectId);
    if (!sourceNode) {
      return false;
    }

    const proposedParentSubjectId = getProposedParentSubjectId(targetId);

    if (proposedParentSubjectId === sourceSubjectId) {
      return false;
    }

    if (proposedParentSubjectId === sourceNode.parentSubjectId) {
      return false;
    }

    if (
      proposedParentSubjectId !== null &&
      isSubjectDescendant(localTree, sourceSubjectId, proposedParentSubjectId)
    ) {
      return false;
    }

    return true;
  }

  function clearDragState() {
    draggedSubjectIdRef.current = null;
    dropTargetIdRef.current = null;
    setDraggedSubjectId(null);
    setDropTargetId(null);
  }

  function handleDragStart(subjectId: string) {
    if (pendingMoveSubjectId !== null) {
      return;
    }

    draggedSubjectIdRef.current = subjectId;
    dropTargetIdRef.current = null;
    setDraggedSubjectId(subjectId);
    setDropTargetId(null);
  }

  function handleDragTarget(targetId: string) {
    if (pendingMoveSubjectId !== null) {
      return;
    }

    if (!canDrop(draggedSubjectIdRef.current, targetId)) {
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
    if (pendingMoveSubjectId !== null || !draggedSubjectIdRef.current) {
      clearDragState();
      return;
    }

    if (!canDrop(draggedSubjectIdRef.current, targetId)) {
      clearDragState();
      return;
    }

    const proposedParentSubjectId = getProposedParentSubjectId(targetId);
    const subjectId = draggedSubjectIdRef.current;

    setPendingMoveSubjectId(subjectId);
    clearDragState();

    const result = await moveSubject(
      proposedParentSubjectId === null
        ? { id: subjectId }
        : { id: subjectId, parentSubjectId: proposedParentSubjectId },
    );

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      setPendingMoveSubjectId(null);
      return;
    }

    onSubjectMoved(subjectId, proposedParentSubjectId);
    setPendingMoveSubjectId(null);
  }

  return {
    draggedSubjectId,
    dropTargetId,
    pendingMoveSubjectId,
    clearDragState,
    handleDragStart,
    handleDragTarget,
    handleDropTarget,
  };
}
