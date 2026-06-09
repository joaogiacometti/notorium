"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";
import { DocumentsSidebar } from "@/components/documents/documents-sidebar";
import { DeleteMindmapDialog } from "@/components/mindmaps/delete-mindmap-dialog";
import { EditMindmapTitleDialog } from "@/components/mindmaps/edit-mindmap-title-dialog";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { EditNoteTitleDialog } from "@/components/notes/edit-note-title-dialog";
import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";

interface DocumentsNavProps {
  subjectId: string;
  documents: DocumentListItem[];
  activeId: string;
  activeKind: DocumentKind;
  onNavigate: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  onEditActive: () => void;
  onDeleteActive: () => void;
}

/**
 * Documents sidebar plus the edit/delete dialogs for non-active documents,
 * shared by the note and mindmap detail views so cross-type actions work from
 * either editor. Actions on the currently open document delegate to the parent.
 *
 * @example
 * <DocumentsNav subjectId={id} documents={docs} activeId={note.id} activeKind="note" ... />
 */
export function DocumentsNav({
  subjectId,
  documents,
  activeId,
  activeKind,
  onNavigate,
  onEditActive,
  onDeleteActive,
}: Readonly<DocumentsNavProps>) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<DocumentListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(
    null,
  );

  function isActive(item: DocumentListItem) {
    return item.id === activeId && item.kind === activeKind;
  }

  function handleEditRequested(item: DocumentListItem) {
    if (isActive(item)) {
      onEditActive();
      return;
    }
    setEditTarget(item);
  }

  function handleDeleteRequested(item: DocumentListItem) {
    if (isActive(item)) {
      onDeleteActive();
      return;
    }
    setDeleteTarget(item);
  }

  return (
    <>
      <DocumentsSidebar
        subjectId={subjectId}
        items={documents}
        activeId={activeId}
        activeKind={activeKind}
        onNavigate={onNavigate}
        onEditRequested={handleEditRequested}
        onDeleteRequested={handleDeleteRequested}
      />

      {editTarget?.kind === "note" ? (
        <EditNoteTitleDialog
          note={{ id: editTarget.id, title: editTarget.title }}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSuccess={() => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      ) : null}
      {editTarget?.kind === "mindmap" ? (
        <EditMindmapTitleDialog
          mindmap={{ id: editTarget.id, title: editTarget.title }}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSuccess={(_newTitle) => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      ) : null}
      {deleteTarget?.kind === "note" ? (
        <DeleteNoteDialog
          noteId={deleteTarget.id}
          noteTitle={deleteTarget.title}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={() => {
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      ) : null}
      {deleteTarget?.kind === "mindmap" ? (
        <DeleteMindmapDialog
          mindmapId={deleteTarget.id}
          mindmapTitle={deleteTarget.title}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={() => {
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
