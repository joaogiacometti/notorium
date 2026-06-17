"use client";

import { FolderPlus, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getSubjectDocuments } from "@/app/actions/subjects";
import { useDocumentRowDialogs } from "@/components/documents/use-document-row-dialogs";
import { CreateMindmapDialog } from "@/components/mindmaps/create-mindmap-dialog";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import { SubjectTreeNodeItem } from "@/components/subjects/tree/subject-tree-node-item";
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
import type { DeckOption, SubjectTreeNode } from "@/lib/server/api-contracts";
import {
  findSubjectTreeNode,
  getSubjectAncestorIds,
  moveSubjectTreeNode,
} from "@/lib/trees/subject-tree";
import { cn } from "@/lib/utils";

interface SubjectTreeSidebarProps {
  tree: SubjectTreeNode[];
  decks: DeckOption[];
  aiEnabled: boolean;
}

/** Extracts the active subject id from a `/subjects/[id]/...` pathname. */
function getActiveSubjectId(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "subjects") {
    return undefined;
  }
  const candidate = segments[1];
  if (!candidate) {
    return undefined;
  }
  return candidate;
}

export function SubjectTreeSidebar({
  tree,
  decks,
  aiEnabled,
}: Readonly<SubjectTreeSidebarProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [localTree, setLocalTree] = useState<SubjectTreeNode[]>(tree);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [documentsBySubject, setDocumentsBySubject] =
    useState<SubjectDocumentsState>(() => new Map());
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

  // Document kebab actions (edit/delete/generate/copy/export) reuse the shared
  // dialog host; reload the affected subject's documents so the tree reflects
  // renames and deletes without waiting for a manual re-expand.
  const { handlers: documentActions, dialogs: documentDialogs } =
    useDocumentRowDialogs({
      aiEnabled,
      decks,
      onChanged: (item) => void loadDocuments(item.subjectId),
    });

  const activeSubjectId = getActiveSubjectId(pathname);

  const {
    draggedSubjectId,
    dropTargetId,
    pendingMoveSubjectId,
    clearDragState,
    handleDragStart,
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
  });

  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  // Reveal the active subject by expanding its ancestor chain.
  useEffect(() => {
    if (!activeSubjectId) {
      return;
    }
    const ancestorIds = getSubjectAncestorIds(localTree, activeSubjectId);
    if (ancestorIds.length === 0) {
      return;
    }
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const ancestorId of ancestorIds) {
        next.add(ancestorId);
      }
      return next;
    });
  }, [localTree, activeSubjectId]);

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
            <RootDropZone
              isActive={dropTargetId === SUBJECT_TREE_ROOT_ID}
              onDragTarget={() => handleDragTarget(SUBJECT_TREE_ROOT_ID)}
              onDropTarget={() => void handleDropTarget(SUBJECT_TREE_ROOT_ID)}
            />
          ) : null}

          {localTree.length === 0 ? (
            <SubjectsEmptyState
              onCreate={() => {
                setCreateParentId(undefined);
                setCreateOpen(true);
              }}
            />
          ) : (
            localTree.map((node) => (
              <SubjectTreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                activeSubjectId={activeSubjectId}
                activeHref={pathname}
                documentsBySubject={documentsBySubject}
                documentActions={documentActions}
                draggedSubjectId={draggedSubjectId}
                dropTargetId={dropTargetId}
                movingSubjectId={pendingMoveSubjectId}
                onToggle={handleToggle}
                onCreateChild={openCreateChild}
                onCreateNote={openCreateNote}
                onCreateMindmap={openCreateMindmap}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onDragStart={handleDragStart}
                onDragTarget={handleDragTarget}
                onDropTarget={(targetId) => void handleDropTarget(targetId)}
                onDragEnd={clearDragState}
              />
            ))
          )}
        </nav>
      </div>

      {documentDialogs}

      <CreateSubjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentSubjectId={createParentId}
        onCreated={handleSubjectCreated}
      />

      {editTarget ? (
        <EditSubjectDialog
          subject={editTarget}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
          onSaved={() => {
            setEditTarget(null);
            refreshTree();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteSubjectDialog
          subjectId={deleteTarget.id}
          subjectName={deleteTarget.name}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          onSuccess={() => {
            setDeleteTarget(null);
            refreshTree();
          }}
        />
      ) : null}

      {createNoteSubjectId ? (
        <CreateNoteTitleDialog
          subjectId={createNoteSubjectId}
          open
          onOpenChange={(open) => {
            if (!open) {
              setCreateNoteSubjectId(null);
            }
          }}
          onSuccess={(noteId) => {
            handleNoteCreated(noteId);
          }}
        />
      ) : null}

      {createMindmapSubjectId ? (
        <CreateMindmapDialog
          subjectId={createMindmapSubjectId}
          open
          onOpenChange={(open) => {
            if (!open) {
              setCreateMindmapSubjectId(null);
            }
          }}
          onSuccess={(mindmapId) => {
            handleMindmapCreated(mindmapId);
          }}
        />
      ) : null}
    </>
  );
}

interface RootDropZoneProps {
  isActive: boolean;
  onDragTarget: () => void;
  onDropTarget: () => void;
}

/** Drop strip shown while dragging; dropping here moves a subject to the top level. */
function RootDropZone({
  isActive,
  onDragTarget,
  onDropTarget,
}: Readonly<RootDropZoneProps>) {
  return (
    <button
      type="button"
      onDragOver={(event) => {
        event.preventDefault();
        onDragTarget();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropTarget();
      }}
      className={cn(
        "mb-1 w-full rounded-md border border-dashed px-2 py-1.5 text-center text-[11px] transition-colors",
        isActive
          ? "border-[color:var(--intent-info-border)] bg-background text-foreground"
          : "border-border/70 text-muted-foreground",
      )}
    >
      Move to top level
    </button>
  );
}

interface SubjectsEmptyStateProps {
  onCreate: () => void;
}

function SubjectsEmptyState({ onCreate }: Readonly<SubjectsEmptyStateProps>) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-border/70 p-4 text-center">
      <p className="text-sm text-muted-foreground">No subjects yet.</p>
      <Button
        type="button"
        size="sm"
        className="mt-3 gap-1.5"
        onClick={onCreate}
      >
        <FolderPlus className="size-4" />
        Create your first subject
      </Button>
    </div>
  );
}
