"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { moveDocument } from "@/app/actions/documents";
import { moveFolder } from "@/app/actions/folders";
import type { DocumentKind } from "@/features/documents/types";
import {
  invalidateDocumentViews,
  invalidateFolderViews,
} from "@/lib/client-cache/invalidation";
import type { FolderTreeNode } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";
import {
  findFolderTreeNode,
  isFolderDescendant,
} from "@/lib/trees/folder-tree";

/** Drop target id for the synthetic "top level" zone (reparents to no parent). */
export const FOLDER_TREE_ROOT_ID = "__folder_tree_root__";

/** A note being dragged, plus the folder it currently lives under. */
export interface DraggedDocument {
  kind: DocumentKind;
  id: string;
  sourceFolderId: string;
}

interface UseFolderDragAndDropParams {
  localTree: FolderTreeNode[];
  onFolderMoved: (
    folderId: string,
    proposedParentFolderId: string | null,
  ) => void;
  onDocumentMoved: (document: DraggedDocument, newFolderId: string) => void;
}

/**
 * Runs `commit` on the next task instead of inside `dragstart`. Chromium
 * aborts a native drag (firing `dragend` at once) when the DOM around the
 * source shifts during `dragstart`; committing drag state there inserts the
 * root drop zone above the tree and pushes the dragged row down, so folder
 * drags never started. Deferring lets the browser lock in the drag first.
 *
 * @example
 * deferPastDragStart(() => setDraggedFolderId(id));
 */
export function deferPastDragStart(
  commit: () => void,
  schedule: (callback: () => void) => void = (callback) => {
    window.setTimeout(callback, 0);
  },
): void {
  schedule(commit);
}

// The synthetic root maps to "no parent"; every other target reparents under it.
function getProposedParentFolderId(targetId: string): string | null {
  return targetId === FOLDER_TREE_ROOT_ID ? null : targetId;
}

/**
 * Owns folder tree drag-and-drop for both folders and documents (notes and
 * notes): hover/drop target tracking, drop validity, and the move server
 * actions. On success it delegates tree mutation to the `onFolderMoved` /
 * `onDocumentMoved` callbacks so the sidebar stays the single owner of its
 * local tree.
 *
 * @example
 * const dnd = useFolderDragAndDrop({
 *   localTree,
 *   onFolderMoved: (id, parentId) => applyMove(id, parentId),
 *   onDocumentMoved: (doc, folderId) => applyDocumentMove(doc, folderId),
 * });
 */
export function useFolderDragAndDrop({
  localTree,
  onFolderMoved,
  onDocumentMoved,
}: UseFolderDragAndDropParams) {
  const queryClient = useQueryClient();
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [draggedDocument, setDraggedDocument] =
    useState<DraggedDocument | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const draggedFolderIdRef = useRef<string | null>(null);
  const draggedDocumentRef = useRef<DraggedDocument | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

  function canDropFolder(sourceFolderId: string, targetId: string): boolean {
    const sourceNode = findFolderTreeNode(localTree, sourceFolderId);
    if (!sourceNode) {
      return false;
    }

    const proposedParentFolderId = getProposedParentFolderId(targetId);

    if (proposedParentFolderId === sourceFolderId) {
      return false;
    }

    if (proposedParentFolderId === sourceNode.parentFolderId) {
      return false;
    }

    return (
      proposedParentFolderId === null ||
      !isFolderDescendant(localTree, sourceFolderId, proposedParentFolderId)
    );
  }

  // Documents must live under a folder, so the root zone is never valid and a
  // drop onto the folder they already belong to is a no-op we reject early.
  function canDropDocument(
    document: DraggedDocument,
    targetId: string,
  ): boolean {
    if (targetId === FOLDER_TREE_ROOT_ID) {
      return false;
    }
    if (targetId === document.sourceFolderId) {
      return false;
    }
    return findFolderTreeNode(localTree, targetId) !== undefined;
  }

  function canDrop(targetId: string): boolean {
    if (draggedDocumentRef.current) {
      return canDropDocument(draggedDocumentRef.current, targetId);
    }
    if (draggedFolderIdRef.current) {
      return canDropFolder(draggedFolderIdRef.current, targetId);
    }
    return false;
  }

  function clearDragState() {
    draggedFolderIdRef.current = null;
    draggedDocumentRef.current = null;
    dropTargetIdRef.current = null;
    setDraggedFolderId(null);
    setDraggedDocument(null);
    setDropTargetId(null);
  }

  function handleDragStart(folderId: string) {
    if (pendingMoveId !== null) {
      return;
    }

    draggedFolderIdRef.current = folderId;
    draggedDocumentRef.current = null;
    dropTargetIdRef.current = null;
    deferPastDragStart(() => {
      // The drag may already have ended (e.g. an instant drop or cancel).
      if (draggedFolderIdRef.current !== folderId) {
        return;
      }
      setDraggedFolderId(folderId);
      setDraggedDocument(null);
      setDropTargetId(null);
    });
  }

  function handleDocumentDragStart(document: DraggedDocument) {
    if (pendingMoveId !== null) {
      return;
    }

    draggedDocumentRef.current = document;
    draggedFolderIdRef.current = null;
    dropTargetIdRef.current = null;
    setDraggedDocument(document);
    setDraggedFolderId(null);
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

    if (draggedFolderIdRef.current) {
      await runFolderMove(draggedFolderIdRef.current, targetId);
    }
  }

  async function runFolderMove(folderId: string, targetId: string) {
    const proposedParentFolderId = getProposedParentFolderId(targetId);
    setPendingMoveId(folderId);
    clearDragState();

    const result = await moveFolder(
      proposedParentFolderId === null
        ? { id: folderId }
        : { id: folderId, parentFolderId: proposedParentFolderId },
    );

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      setPendingMoveId(null);
      return;
    }

    await invalidateFolderViews(queryClient);
    onFolderMoved(folderId, proposedParentFolderId);
    setPendingMoveId(null);
  }

  async function runDocumentMove(
    document: DraggedDocument,
    targetFolderId: string,
  ) {
    setPendingMoveId(document.id);
    clearDragState();

    const result = await moveDocument({
      kind: document.kind,
      id: document.id,
      folderId: targetFolderId,
    });

    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      setPendingMoveId(null);
      return;
    }

    await invalidateDocumentViews(queryClient, [
      document.sourceFolderId,
      targetFolderId,
    ]);
    onDocumentMoved(document, targetFolderId);
    setPendingMoveId(null);
  }

  // Only offer "Move to top level" when it is a real destination: a nested,
  // movable folder is being dragged (root folders are already top level).
  const isRootDropZoneVisible =
    draggedFolderId !== null &&
    canDropFolder(draggedFolderId, FOLDER_TREE_ROOT_ID);

  return {
    draggedFolderId,
    isRootDropZoneVisible,
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
