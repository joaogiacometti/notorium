"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDocumentRowDialogs } from "@/components/documents/use-document-row-dialogs";
import { FolderTreeDialogs } from "@/components/folders/tree/folder-tree-dialogs";
import { FolderTreeEmptyState } from "@/components/folders/tree/folder-tree-empty-state";
import { FolderTreeNodeItem } from "@/components/folders/tree/folder-tree-node-item";
import { FolderTreeRootDropZone } from "@/components/folders/tree/folder-tree-root-drop-zone";
import type {
  DocumentCreateTarget,
  FolderDeleteTarget,
  FolderEditTarget,
} from "@/components/folders/tree/folder-tree-types";
import {
  FOLDER_TREE_ROOT_ID,
  useFolderDragAndDrop,
} from "@/components/folders/tree/use-folder-drag-and-drop";
import { Button } from "@/components/ui/button";
import { getFolderDeleteRedirectHref } from "@/lib/navigation/delete-redirects";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { getDocumentFolderIdFromPathname } from "@/lib/navigation/folder-path";
import type { FolderTreeNode } from "@/lib/server/api-contracts";
import {
  getFolderAncestorIds,
  moveFolderTreeNode,
} from "@/lib/trees/folder-tree";

interface FolderTreeSidebarProps {
  tree: FolderTreeNode[];
}

export function FolderTreeSidebar({ tree }: Readonly<FolderTreeSidebarProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [localTree, setLocalTree] = useState<FolderTreeNode[]>(tree);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [createParentId, setCreateParentId] = useState<string | undefined>(
    undefined,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FolderEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderDeleteTarget | null>(
    null,
  );
  const [createDocumentTarget, setCreateDocumentTarget] =
    useState<DocumentCreateTarget | null>(null);
  const [createFlashcardFolderId, setCreateFlashcardFolderId] = useState<
    string | null
  >(null);

  const { handlers: documentActions, dialogs: documentDialogs } =
    useDocumentRowDialogs();

  const activeFolderId = getDocumentFolderIdFromPathname(pathname);

  const {
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
  } = useFolderDragAndDrop({
    localTree,
    onFolderMoved: (folderId, proposedParentFolderId) => {
      setLocalTree((current) =>
        moveFolderTreeNode(current, folderId, proposedParentFolderId),
      );
      if (proposedParentFolderId) {
        setExpandedIds((current) =>
          new Set(current).add(proposedParentFolderId),
        );
      }
      refreshTree();
    },
    onDocumentMoved: (document, newFolderId) => {
      setExpandedIds((current) => new Set(current).add(newFolderId));

      // If the moved document is the one currently open, its old URL no longer
      // matches its folder and the page would server-redirect mid-refresh.
      // Navigate to the new URL directly instead; that push also reconciles the
      // server-side document counts. Otherwise just refresh the tree counts.
      const oldHref = getDocumentDetailHref({
        kind: document.kind,
        folderId: document.sourceFolderId,
        id: document.id,
      });
      if (pathname === oldHref) {
        router.push(
          getDocumentDetailHref({
            kind: document.kind,
            folderId: newFolderId,
            id: document.id,
          }),
        );
        return;
      }
      refreshTree();
    },
  });

  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  // Reveal the open document by expanding its folder and every ancestor.
  useEffect(() => {
    if (!activeFolderId) {
      return;
    }
    const idsToExpand = [
      ...getFolderAncestorIds(localTree, activeFolderId),
      activeFolderId,
    ];
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of idsToExpand) {
        next.add(id);
      }
      return next;
    });
  }, [localTree, activeFolderId]);

  function refreshTree() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleToggle(folderId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  function openCreateChild(parentFolderId: string) {
    setCreateParentId(parentFolderId);
    setCreateOpen(true);
  }

  function openCreateRoot() {
    setCreateParentId(undefined);
    setCreateOpen(true);
  }

  function handleDocumentCreated(documentId: string) {
    const target = createDocumentTarget;
    setCreateDocumentTarget(null);
    if (target) {
      router.push(getDocumentDetailHref({ ...target, id: documentId }));
    }
    refreshTree();
  }

  function openCreateFlashcard(folderId: string) {
    setCreateFlashcardFolderId(folderId);
  }

  function handleFolderCreated() {
    if (createParentId) {
      setExpandedIds((current) => new Set(current).add(createParentId));
    }
    refreshTree();
  }

  function handleFolderDeleted(folderId: string) {
    const redirectHref = getFolderDeleteRedirectHref(
      pathname,
      localTree,
      folderId,
    );
    if (redirectHref) {
      router.push(redirectHref);
    }
    refreshTree();
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Folders
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New folder"
            onClick={openCreateRoot}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <nav
          aria-label="Folders"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-4"
        >
          {isRootDropZoneVisible ? (
            <FolderTreeRootDropZone
              isActive={dropTargetId === FOLDER_TREE_ROOT_ID}
              onDragTarget={() => handleDragTarget(FOLDER_TREE_ROOT_ID)}
              onDropTarget={() => void handleDropTarget(FOLDER_TREE_ROOT_ID)}
            />
          ) : null}

          {localTree.length === 0 ? (
            <FolderTreeEmptyState onCreateFolder={openCreateRoot} />
          ) : (
            localTree.map((node) => (
              <FolderTreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                activeHref={pathname}
                documentActions={documentActions}
                draggedFolderId={draggedFolderId}
                draggedDocumentId={draggedDocument?.id ?? null}
                dropTargetId={dropTargetId}
                pendingMoveId={pendingMoveId}
                onToggle={handleToggle}
                onCreateChild={openCreateChild}
                onCreateNote={(folderId) =>
                  setCreateDocumentTarget({ kind: "note", folderId })
                }
                onCreatePdf={(folderId) =>
                  setCreateDocumentTarget({ kind: "pdf", folderId })
                }
                onCreateFlashcard={openCreateFlashcard}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onDragStart={handleDragStart}
                onDocumentDragStart={handleDocumentDragStart}
                onDragTarget={handleDragTarget}
                onDropTarget={(targetId) => void handleDropTarget(targetId)}
                onDragEnd={clearDragState}
              />
            ))
          )}
        </nav>
      </div>

      <FolderTreeDialogs
        documentDialogs={documentDialogs}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        createParentId={createParentId}
        onFolderCreated={handleFolderCreated}
        editTarget={editTarget}
        onEditTargetChange={setEditTarget}
        deleteTarget={deleteTarget}
        onDeleteTargetChange={setDeleteTarget}
        createDocumentTarget={createDocumentTarget}
        onCreateDocumentTargetChange={setCreateDocumentTarget}
        onDocumentCreated={handleDocumentCreated}
        createFlashcardFolderId={createFlashcardFolderId}
        onCreateFlashcardFolderIdChange={setCreateFlashcardFolderId}
        onRefreshTree={refreshTree}
        onFolderDeleted={handleFolderDeleted}
      />
    </>
  );
}
