"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { moveDocument } from "@/app/actions/documents";
import { moveSubject } from "@/app/actions/subjects";
import type { DocumentKind } from "@/features/documents/types";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import {
  findSubjectTreeNode,
  isSubjectDescendant,
} from "@/lib/trees/subject-tree";

/** Drop target id for the synthetic "top level" zone (reparents to no parent). */
export const SUBJECT_TREE_ROOT_ID = "__subject_tree_root__";

/** A note or mindmap being dragged, plus the subject it currently lives under. */
export interface DraggedDocument {
  kind: DocumentKind;
  id: string;
  sourceSubjectId: string;
}

interface UseSubjectDragAndDropParams {
  localTree: SubjectTreeNode[];
  onSubjectMoved: (
    subjectId: string,
    proposedParentSubjectId: string | null,
  ) => void;
  onDocumentMoved: (document: DraggedDocument, newSubjectId: string) => void;
}

// The synthetic root maps to "no parent"; every other target reparents under it.
function getProposedParentSubjectId(targetId: string): string | null {
  return targetId === SUBJECT_TREE_ROOT_ID ? null : targetId;
}

/**
 * Owns subject tree drag-and-drop for both subjects and documents (notes and
 * mindmaps): hover/drop target tracking, drop validity, and the move server
 * actions. On success it delegates tree mutation to the `onSubjectMoved` /
 * `onDocumentMoved` callbacks so the sidebar stays the single owner of its
 * local tree.
 *
 * @example
 * const dnd = useSubjectDragAndDrop({
 *   localTree,
 *   onSubjectMoved: (id, parentId) => applyMove(id, parentId),
 *   onDocumentMoved: (doc, subjectId) => applyDocumentMove(doc, subjectId),
 * });
 */
export function useSubjectDragAndDrop({
  localTree,
  onSubjectMoved,
  onDocumentMoved,
}: UseSubjectDragAndDropParams) {
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);
  const [draggedDocument, setDraggedDocument] =
    useState<DraggedDocument | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const draggedSubjectIdRef = useRef<string | null>(null);
  const draggedDocumentRef = useRef<DraggedDocument | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

  function canDropSubject(sourceSubjectId: string, targetId: string): boolean {
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

    return (
      proposedParentSubjectId === null ||
      !isSubjectDescendant(localTree, sourceSubjectId, proposedParentSubjectId)
    );
  }

  // Documents must live under a subject, so the root zone is never valid and a
  // drop onto the subject they already belong to is a no-op we reject early.
  function canDropDocument(
    document: DraggedDocument,
    targetId: string,
  ): boolean {
    if (targetId === SUBJECT_TREE_ROOT_ID) {
      return false;
    }
    if (targetId === document.sourceSubjectId) {
      return false;
    }
    return findSubjectTreeNode(localTree, targetId) !== undefined;
  }

  function canDrop(targetId: string): boolean {
    if (draggedDocumentRef.current) {
      return canDropDocument(draggedDocumentRef.current, targetId);
    }
    if (draggedSubjectIdRef.current) {
      return canDropSubject(draggedSubjectIdRef.current, targetId);
    }
    return false;
  }

  function clearDragState() {
    draggedSubjectIdRef.current = null;
    draggedDocumentRef.current = null;
    dropTargetIdRef.current = null;
    setDraggedSubjectId(null);
    setDraggedDocument(null);
    setDropTargetId(null);
  }

  function handleDragStart(subjectId: string) {
    if (pendingMoveId !== null) {
      return;
    }

    draggedSubjectIdRef.current = subjectId;
    draggedDocumentRef.current = null;
    dropTargetIdRef.current = null;
    setDraggedSubjectId(subjectId);
    setDraggedDocument(null);
    setDropTargetId(null);
  }

  function handleDocumentDragStart(document: DraggedDocument) {
    if (pendingMoveId !== null) {
      return;
    }

    draggedDocumentRef.current = document;
    draggedSubjectIdRef.current = null;
    dropTargetIdRef.current = null;
    setDraggedDocument(document);
    setDraggedSubjectId(null);
    setDropTargetId(null);
  }

  function handleDragTarget(targetId: string) {
    if (pendingMoveId !== null) {
      return;
    }

    if (!canDrop(targetId)) {
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
    if (pendingMoveId !== null || !canDrop(targetId)) {
      clearDragState();
      return;
    }

    if (draggedDocumentRef.current) {
      await runDocumentMove(draggedDocumentRef.current, targetId);
      return;
    }

    if (draggedSubjectIdRef.current) {
      await runSubjectMove(draggedSubjectIdRef.current, targetId);
    }
  }

  async function runSubjectMove(subjectId: string, targetId: string) {
    const proposedParentSubjectId = getProposedParentSubjectId(targetId);
    setPendingMoveId(subjectId);
    clearDragState();

    const result = await moveSubject(
      proposedParentSubjectId === null
        ? { id: subjectId }
        : { id: subjectId, parentSubjectId: proposedParentSubjectId },
    );

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      setPendingMoveId(null);
      return;
    }

    onSubjectMoved(subjectId, proposedParentSubjectId);
    setPendingMoveId(null);
  }

  async function runDocumentMove(
    document: DraggedDocument,
    targetSubjectId: string,
  ) {
    setPendingMoveId(document.id);
    clearDragState();

    const result = await moveDocument({
      kind: document.kind,
      id: document.id,
      subjectId: targetSubjectId,
    });

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      setPendingMoveId(null);
      return;
    }

    onDocumentMoved(document, targetSubjectId);
    setPendingMoveId(null);
  }

  return {
    draggedSubjectId,
    draggedDocument,
    dropTargetId,
    pendingMoveId,
    clearDragState,
    handleDragStart,
    handleDocumentDragStart,
    handleDragTarget,
    handleDropTarget,
  };
}
