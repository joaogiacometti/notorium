"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDocumentRowDialogs } from "@/components/documents/use-document-row-dialogs";
import {
  getActiveDocumentSubjectId,
  getActiveSubjectId,
} from "@/components/subjects/tree/subject-tree-active-path";
import { SubjectTreeDialogs } from "@/components/subjects/tree/subject-tree-dialogs";
import { SubjectTreeEmptyState } from "@/components/subjects/tree/subject-tree-empty-state";
import { SubjectTreeNodeItem } from "@/components/subjects/tree/subject-tree-node-item";
import { SubjectTreeRootDropZone } from "@/components/subjects/tree/subject-tree-root-drop-zone";
import type {
  DocumentCreateTarget,
  SubjectDeleteTarget,
  SubjectEditTarget,
} from "@/components/subjects/tree/subject-tree-types";
import {
  SUBJECT_TREE_ROOT_ID,
  useSubjectDragAndDrop,
} from "@/components/subjects/tree/use-subject-drag-and-drop";
import { Button } from "@/components/ui/button";
import { getSubjectDeleteRedirectHref } from "@/lib/navigation/delete-redirects";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";
import {
  getSubjectAncestorIds,
  moveSubjectTreeNode,
} from "@/lib/trees/subject-tree";

interface SubjectTreeSidebarProps {
  tree: SubjectTreeNode[];
}

export function SubjectTreeSidebar({
  tree,
}: Readonly<SubjectTreeSidebarProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [localTree, setLocalTree] = useState<SubjectTreeNode[]>(tree);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [createParentId, setCreateParentId] = useState<string | undefined>(
    undefined,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubjectEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectDeleteTarget | null>(
    null,
  );
  const [createDocumentTarget, setCreateDocumentTarget] =
    useState<DocumentCreateTarget | null>(null);
  const [createFlashcardSubjectId, setCreateFlashcardSubjectId] = useState<
    string | null
  >(null);

  const { handlers: documentActions, dialogs: documentDialogs } =
    useDocumentRowDialogs();

  const activeSubjectId = getActiveSubjectId(pathname);
  const activeDocumentSubjectId = getActiveDocumentSubjectId(pathname);
  // Highlight a subject only when it is the destination itself, not when one of
  // its documents is open; otherwise the parent and the document both appear
  // selected. The document row highlights itself via its href.
  const selectedSubjectId = activeDocumentSubjectId
    ? undefined
    : activeSubjectId;

  const {
    draggedSubjectId,
    isRootDropZoneVisible,
    draggedDocument,
    dropTargetId,
    pendingMoveId,
    clearDragState,
    handleDragStart,
    handleDocumentDragStart,
    handleDragTarget,
    handleDropTarget,
  } = useSubjectDragAndDrop({
    localTree,
    onSubjectMoved: (subjectId, proposedParentSubjectId) => {
      setLocalTree((current) =>
        moveSubjectTreeNode(current, subjectId, proposedParentSubjectId),
      );
      if (proposedParentSubjectId) {
        setExpandedIds((current) =>
          new Set(current).add(proposedParentSubjectId),
        );
      }
      refreshTree();
    },
    onDocumentMoved: (document, newSubjectId) => {
      setExpandedIds((current) => new Set(current).add(newSubjectId));

      // If the moved document is the one currently open, its old URL no longer
      // matches its subject and the page would server-redirect mid-refresh.
      // Navigate to the new URL directly instead; that push also reconciles the
      // server-side document counts. Otherwise just refresh the tree counts.
      const oldHref = getDocumentDetailHref({
        kind: document.kind,
        subjectId: document.sourceSubjectId,
        id: document.id,
      });
      if (pathname === oldHref) {
        router.push(
          getDocumentDetailHref({
            kind: document.kind,
            subjectId: newSubjectId,
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

  // Reveal the active location by expanding the active subject's ancestor
  // chain. When a note is open, also expand its containing subject so
  // the document row itself is visible (ancestors alone leave it collapsed).
  useEffect(() => {
    if (!activeSubjectId) {
      return;
    }
    const idsToExpand = getSubjectAncestorIds(localTree, activeSubjectId);
    if (activeDocumentSubjectId) {
      idsToExpand.push(activeDocumentSubjectId);
    }
    if (idsToExpand.length === 0) {
      return;
    }
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of idsToExpand) {
        next.add(id);
      }
      return next;
    });
  }, [localTree, activeSubjectId, activeDocumentSubjectId]);

  function refreshTree() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleToggle(subjectId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  }

  function openCreateChild(parentSubjectId: string) {
    setCreateParentId(parentSubjectId);
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

  function openCreateFlashcard(subjectId: string) {
    setCreateFlashcardSubjectId(subjectId);
  }

  function handleSubjectCreated() {
    if (createParentId) {
      setExpandedIds((current) => new Set(current).add(createParentId));
    }
    refreshTree();
  }

  function handleSubjectDeleted(subjectId: string) {
    const redirectHref = getSubjectDeleteRedirectHref(
      pathname,
      localTree,
      subjectId,
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
            Subjects
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New subject"
            onClick={openCreateRoot}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <nav
          aria-label="Subjects"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-4"
        >
          {isRootDropZoneVisible ? (
            <SubjectTreeRootDropZone
              isActive={dropTargetId === SUBJECT_TREE_ROOT_ID}
              onDragTarget={() => handleDragTarget(SUBJECT_TREE_ROOT_ID)}
              onDropTarget={() => void handleDropTarget(SUBJECT_TREE_ROOT_ID)}
            />
          ) : null}

          {localTree.length === 0 ? (
            <SubjectTreeEmptyState onCreateSubject={openCreateRoot} />
          ) : (
            localTree.map((node) => (
              <SubjectTreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                activeSubjectId={selectedSubjectId}
                activeHref={pathname}
                documentActions={documentActions}
                draggedSubjectId={draggedSubjectId}
                draggedDocumentId={draggedDocument?.id ?? null}
                dropTargetId={dropTargetId}
                pendingMoveId={pendingMoveId}
                onToggle={handleToggle}
                onCreateChild={openCreateChild}
                onCreateNote={(subjectId) =>
                  setCreateDocumentTarget({ kind: "note", subjectId })
                }
                onCreatePdf={(subjectId) =>
                  setCreateDocumentTarget({ kind: "pdf", subjectId })
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

      <SubjectTreeDialogs
        documentDialogs={documentDialogs}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        createParentId={createParentId}
        onSubjectCreated={handleSubjectCreated}
        editTarget={editTarget}
        onEditTargetChange={setEditTarget}
        deleteTarget={deleteTarget}
        onDeleteTargetChange={setDeleteTarget}
        createDocumentTarget={createDocumentTarget}
        onCreateDocumentTargetChange={setCreateDocumentTarget}
        onDocumentCreated={handleDocumentCreated}
        createFlashcardSubjectId={createFlashcardSubjectId}
        onCreateFlashcardSubjectIdChange={setCreateFlashcardSubjectId}
        onRefreshTree={refreshTree}
        onSubjectDeleted={handleSubjectDeleted}
      />
    </>
  );
}
