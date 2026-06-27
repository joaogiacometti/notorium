"use client";

import { FolderPlus, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { getSubjectDocuments } from "@/app/actions/subjects";
import { useDocumentRowDialogs } from "@/components/documents/use-document-row-dialogs";
import {
  getActiveDocumentSubjectId,
  getActiveSubjectId,
} from "@/components/subjects/tree/subject-tree-active-path";
import { SubjectTreeDialogs } from "@/components/subjects/tree/subject-tree-dialogs";
import { SubjectTreeNodeItem } from "@/components/subjects/tree/subject-tree-node-item";
import { SubjectTreeRootDropZone } from "@/components/subjects/tree/subject-tree-root-drop-zone";
import type {
  SubjectDeleteTarget,
  SubjectDocumentsState,
  SubjectEditTarget,
} from "@/components/subjects/tree/subject-tree-types";
import {
  SUBJECT_TREE_ROOT_ID,
  useSubjectDragAndDrop,
} from "@/components/subjects/tree/use-subject-drag-and-drop";
import { Button } from "@/components/ui/button";
import {
  getBookDetailHref,
  getDocumentDetailHref,
} from "@/lib/navigation/detail-page-back-link";
import type {
  SubjectOption,
  SubjectTreeNode,
} from "@/lib/server/api-contracts";
import {
  findSubjectTreeNode,
  getSubjectAncestorIds,
  moveSubjectTreeNode,
} from "@/lib/trees/subject-tree";

interface SubjectTreeSidebarProps {
  tree: SubjectTreeNode[];
  subjects: SubjectOption[];
  aiEnabled: boolean;
}

export function SubjectTreeSidebar({
  tree,
  subjects,
  aiEnabled,
}: Readonly<SubjectTreeSidebarProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [localTree, setLocalTree] = useState<SubjectTreeNode[]>(tree);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [documentsBySubject, setDocumentsBySubject] =
    useState<SubjectDocumentsState>(() => new Map());
  const previousDocumentSubjectIdRef = useRef<string | undefined>(undefined);
  const [createParentId, setCreateParentId] = useState<string | undefined>(
    undefined,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubjectEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectDeleteTarget | null>(
    null,
  );
  const [createNoteSubjectId, setCreateNoteSubjectId] = useState<string | null>(
    null,
  );
  const [createMindmapSubjectId, setCreateMindmapSubjectId] = useState<
    string | null
  >(null);
  const [createBookSubjectId, setCreateBookSubjectId] = useState<string | null>(
    null,
  );
  const [createFlashcardSubjectId, setCreateFlashcardSubjectId] = useState<
    string | null
  >(null);
  const [createAssessmentSubjectId, setCreateAssessmentSubjectId] = useState<
    string | null
  >(null);
  const [recordMissSubjectId, setRecordMissSubjectId] = useState<string | null>(
    null,
  );

  // Document kebab actions (edit/delete/generate/copy/export) reuse the shared
  // dialog host; reload the affected subject's documents so the tree reflects
  // renames and deletes without waiting for a manual re-expand.
  const { handlers: documentActions, dialogs: documentDialogs } =
    useDocumentRowDialogs({
      aiEnabled,
      subjects,
      onChanged: (item) => void loadDocuments(item.subjectId),
    });

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
      // Drop the moved document from its origin's cached list, then reveal and
      // reload the destination so both branches reflect the move immediately.
      setDocumentsBySubject((current) => {
        const source = current.get(document.sourceSubjectId);
        if (!Array.isArray(source)) {
          return current;
        }
        return new Map(current).set(
          document.sourceSubjectId,
          source.filter((item) => item.id !== document.id),
        );
      });
      setExpandedIds((current) => new Set(current).add(newSubjectId));
      void loadDocuments(newSubjectId);

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

  useEffect(() => {
    const onDocumentsChanged = (event: Event) => {
      const subjectId = (event as CustomEvent<{ subjectId?: string }>).detail
        ?.subjectId;
      if (!subjectId) {
        return;
      }
      setExpandedIds((current) => new Set(current).add(subjectId));
      setDocumentsBySubject((current) =>
        new Map(current).set(subjectId, "loading"),
      );
      void getSubjectDocuments(subjectId).then((documents) => {
        setDocumentsBySubject((current) =>
          new Map(current).set(subjectId, documents),
        );
      });
      startTransition(() => {
        router.refresh();
      });
    };
    window.addEventListener(
      "notorium:subject-documents-changed",
      onDocumentsChanged,
    );
    return () =>
      window.removeEventListener(
        "notorium:subject-documents-changed",
        onDocumentsChanged,
      );
  }, [router]);

  // Reveal the active location by expanding the active subject's ancestor
  // chain. When a note or mindmap is open, also expand its containing subject so
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

  // Load the open document's subject rows on first paint so the active note or
  // mindmap appears in the tree without a manual expand.
  useEffect(() => {
    if (
      !activeDocumentSubjectId ||
      documentsBySubject.has(activeDocumentSubjectId)
    ) {
      return;
    }
    const node = findSubjectTreeNode(localTree, activeDocumentSubjectId);
    if (!node || node.documentCount === 0) {
      return;
    }
    // Inlined rather than calling loadDocuments so the effect depends only on
    // stable values (the setter and the server action), not a render-local fn.
    const subjectId = activeDocumentSubjectId;
    setDocumentsBySubject((current) =>
      new Map(current).set(subjectId, "loading"),
    );
    void getSubjectDocuments(subjectId).then((documents) => {
      setDocumentsBySubject((current) =>
        new Map(current).set(subjectId, documents),
      );
    });
  }, [localTree, activeDocumentSubjectId, documentsBySubject]);

  useEffect(() => {
    const previousDocumentSubjectId = previousDocumentSubjectIdRef.current;
    previousDocumentSubjectIdRef.current = activeDocumentSubjectId;

    if (
      !activeSubjectId ||
      activeDocumentSubjectId ||
      previousDocumentSubjectId !== activeSubjectId ||
      !documentsBySubject.has(activeSubjectId)
    ) {
      return;
    }

    const subjectId = activeSubjectId;
    setDocumentsBySubject((current) =>
      new Map(current).set(subjectId, "loading"),
    );
    void getSubjectDocuments(subjectId).then((documents) => {
      setDocumentsBySubject((current) =>
        new Map(current).set(subjectId, documents),
      );
    });
  }, [activeSubjectId, activeDocumentSubjectId, documentsBySubject]);

  function refreshTree() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function loadDocuments(subjectId: string) {
    setDocumentsBySubject((current) =>
      new Map(current).set(subjectId, "loading"),
    );
    const documents = await getSubjectDocuments(subjectId);
    setDocumentsBySubject((current) =>
      new Map(current).set(subjectId, documents),
    );
  }

  function handleToggle(subjectId: string) {
    const willExpand = !expandedIds.has(subjectId);
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });

    if (!willExpand || documentsBySubject.has(subjectId)) {
      return;
    }
    const node = findSubjectTreeNode(localTree, subjectId);
    if (node && node.documentCount > 0) {
      void loadDocuments(subjectId);
    }
  }

  function openCreateChild(parentSubjectId: string) {
    setCreateParentId(parentSubjectId);
    setCreateOpen(true);
  }

  function openCreateNote(subjectId: string) {
    setCreateNoteSubjectId(subjectId);
  }

  function handleNoteCreated(noteId: string) {
    const subjectId = createNoteSubjectId;
    setCreateNoteSubjectId(null);
    if (subjectId) {
      void loadDocuments(subjectId);
      router.push(`/subjects/${subjectId}/documents/notes/${noteId}`);
    }
    refreshTree();
  }

  function openCreateMindmap(subjectId: string) {
    setCreateMindmapSubjectId(subjectId);
  }

  function handleMindmapCreated(mindmapId: string) {
    const subjectId = createMindmapSubjectId;
    setCreateMindmapSubjectId(null);
    if (subjectId) {
      void loadDocuments(subjectId);
      router.push(`/subjects/${subjectId}/documents/mindmaps/${mindmapId}`);
    }
    refreshTree();
  }

  function openCreateBook(subjectId: string) {
    setCreateBookSubjectId(subjectId);
  }

  function openCreateFlashcard(subjectId: string) {
    setCreateFlashcardSubjectId(subjectId);
  }

  function openCreateAssessment(subjectId: string) {
    setCreateAssessmentSubjectId(subjectId);
  }

  function openRecordMiss(subjectId: string) {
    setRecordMissSubjectId(subjectId);
  }

  function handleBookUploaded(book: { id: string; subjectId: string }) {
    setCreateBookSubjectId(null);
    setExpandedIds((current) => new Set(current).add(book.subjectId));
    void loadDocuments(book.subjectId);
    router.push(getBookDetailHref(book.subjectId, book.id));
    refreshTree();
  }

  function handleSubjectCreated() {
    if (createParentId) {
      setExpandedIds((current) => new Set(current).add(createParentId));
    }
    refreshTree();
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Subjects
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New subject"
            onClick={() => {
              setCreateParentId(undefined);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <nav
          aria-label="Subjects"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-4"
        >
          {draggedSubjectId ? (
            <SubjectTreeRootDropZone
              isActive={dropTargetId === SUBJECT_TREE_ROOT_ID}
              onDragTarget={() => handleDragTarget(SUBJECT_TREE_ROOT_ID)}
              onDropTarget={() => void handleDropTarget(SUBJECT_TREE_ROOT_ID)}
            />
          ) : null}

          {localTree.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-border/60 p-4 text-center">
              <p className="text-sm text-muted-foreground">No subjects yet.</p>
              <Button
                type="button"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => {
                  setCreateParentId(undefined);
                  setCreateOpen(true);
                }}
              >
                <FolderPlus className="size-4" />
                Create your first subject
              </Button>
            </div>
          ) : (
            localTree.map((node) => (
              <SubjectTreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                activeSubjectId={selectedSubjectId}
                activeHref={pathname}
                documentsBySubject={documentsBySubject}
                documentActions={documentActions}
                draggedSubjectId={draggedSubjectId}
                draggedDocumentId={draggedDocument?.id ?? null}
                dropTargetId={dropTargetId}
                pendingMoveId={pendingMoveId}
                onToggle={handleToggle}
                onCreateChild={openCreateChild}
                onCreateAssessment={openCreateAssessment}
                onRecordMiss={openRecordMiss}
                onCreateNote={openCreateNote}
                onCreateMindmap={openCreateMindmap}
                onCreateBook={openCreateBook}
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
        aiEnabled={aiEnabled}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        createParentId={createParentId}
        onSubjectCreated={handleSubjectCreated}
        editTarget={editTarget}
        onEditTargetChange={setEditTarget}
        deleteTarget={deleteTarget}
        onDeleteTargetChange={setDeleteTarget}
        createNoteSubjectId={createNoteSubjectId}
        onCreateNoteSubjectIdChange={setCreateNoteSubjectId}
        onNoteCreated={handleNoteCreated}
        createMindmapSubjectId={createMindmapSubjectId}
        onCreateMindmapSubjectIdChange={setCreateMindmapSubjectId}
        onMindmapCreated={handleMindmapCreated}
        createBookSubjectId={createBookSubjectId}
        onCreateBookSubjectIdChange={setCreateBookSubjectId}
        onBookUploaded={handleBookUploaded}
        createFlashcardSubjectId={createFlashcardSubjectId}
        onCreateFlashcardSubjectIdChange={setCreateFlashcardSubjectId}
        createAssessmentSubjectId={createAssessmentSubjectId}
        onCreateAssessmentSubjectIdChange={setCreateAssessmentSubjectId}
        recordMissSubjectId={recordMissSubjectId}
        onRecordMissSubjectIdChange={setRecordMissSubjectId}
        onRefreshTree={refreshTree}
      />
    </>
  );
}
