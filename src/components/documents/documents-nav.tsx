"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { getNoteById } from "@/app/actions/notes";
import { DocumentsSidebar } from "@/components/documents/documents-sidebar";
import { DeleteMindmapDialog } from "@/components/mindmaps/delete-mindmap-dialog";
import { EditMindmapTitleDialog } from "@/components/mindmaps/edit-mindmap-title-dialog";
import { GenerateMindmapFlashcardsDialog } from "@/components/mindmaps/generate-mindmap-flashcards-dialog";
import { OffscreenMindmapPngExport } from "@/components/mindmaps/offscreen-mindmap-png-export";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { EditNoteTitleDialog } from "@/components/notes/edit-note-title-dialog";
import { GenerateNoteFlashcardsDialog } from "@/components/notes/generate-note-flashcards-dialog";
import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import type { DeckOption } from "@/lib/server/api-contracts";

// Copies a note that is not open in the editor: its content is not in client
// state, so the last saved version is fetched before writing to the clipboard.
async function copySavedNoteContent(noteId: string, format: NoteCopyFormat) {
  try {
    const note = await getNoteById(noteId);
    if (!note) {
      throw new Error(`Note ${noteId} not found`);
    }
    await copyNoteContentToClipboard(note.content ?? "", format);
    toast.success("Note copied.");
  } catch {
    toast.error("Could not copy note.");
  }
}

interface DocumentsNavProps {
  subjectId: string;
  subjectName: string;
  documents: DocumentListItem[];
  /** Omit both active props when no document is open (full list page). */
  activeId?: string;
  activeKind?: DocumentKind;
  aiEnabled: boolean;
  decks: DeckOption[];
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  onEditActive?: () => void;
  onDeleteActive?: () => void;
  /** Copies the active note with its unsaved in-editor content. */
  onCopyActive?: (format: NoteCopyFormat) => void;
  /** Opens the active document's flashcard generation dialog in the parent. */
  onGenerateActive?: () => void;
  /** Exports the active mindmap from its live canvas in the parent. */
  onExportActive?: () => void;
}

/**
 * Documents sidebar plus the full per-document action set (edit, delete, note
 * copy/flashcards, mindmap PNG export), shared by the note and mindmap detail
 * views and the full documents list so every action works from any of them —
 * including on documents that are not currently open. Actions on the open
 * document delegate to the parent.
 *
 * @example
 * <DocumentsNav subjectId={id} documents={docs} activeId={note.id} activeKind="note" ... />
 */
export function DocumentsNav({
  subjectId,
  subjectName,
  documents,
  activeId,
  activeKind,
  aiEnabled,
  decks,
  onNavigate,
  onEditActive,
  onDeleteActive,
  onCopyActive,
  onGenerateActive,
  onExportActive,
}: Readonly<DocumentsNavProps>) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<DocumentListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(
    null,
  );
  const [generateTarget, setGenerateTarget] = useState<DocumentListItem | null>(
    null,
  );
  const [exportTargetId, setExportTargetId] = useState<string | null>(null);

  function isActive(item: DocumentListItem) {
    return (
      activeId !== undefined && item.id === activeId && item.kind === activeKind
    );
  }

  function handleEditRequested(item: DocumentListItem) {
    if (isActive(item) && onEditActive) {
      onEditActive();
      return;
    }
    setEditTarget(item);
  }

  function handleDeleteRequested(item: DocumentListItem) {
    if (isActive(item) && onDeleteActive) {
      onDeleteActive();
      return;
    }
    setDeleteTarget(item);
  }

  function handleCopyRequested(item: DocumentListItem, format: NoteCopyFormat) {
    if (isActive(item) && onCopyActive) {
      onCopyActive(format);
      return;
    }
    void copySavedNoteContent(item.id, format);
  }

  function handleGenerateRequested(item: DocumentListItem) {
    if (isActive(item) && onGenerateActive) {
      onGenerateActive();
      return;
    }
    setGenerateTarget(item);
  }

  function handleExportRequested(item: DocumentListItem) {
    if (isActive(item) && onExportActive) {
      onExportActive();
      return;
    }
    setExportTargetId(item.id);
  }

  return (
    <>
      <DocumentsSidebar
        subjectId={subjectId}
        subjectName={subjectName}
        items={documents}
        activeId={activeId}
        activeKind={activeKind}
        onNavigate={onNavigate}
        onEditRequested={handleEditRequested}
        onDeleteRequested={handleDeleteRequested}
        onCopyRequested={handleCopyRequested}
        onGenerateRequested={aiEnabled ? handleGenerateRequested : undefined}
        generateDisabledReason={
          decks.length > 0
            ? undefined
            : "Create a deck before generating flashcards."
        }
        onExportRequested={handleExportRequested}
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
      {generateTarget?.kind === "note" ? (
        <GenerateNoteFlashcardsDialog
          decks={decks}
          noteId={generateTarget.id}
          open
          onOpenChange={(open) => {
            if (!open) setGenerateTarget(null);
          }}
        />
      ) : null}
      {generateTarget?.kind === "mindmap" ? (
        <GenerateMindmapFlashcardsDialog
          decks={decks}
          mindmapId={generateTarget.id}
          open
          onOpenChange={(open) => {
            if (!open) setGenerateTarget(null);
          }}
        />
      ) : null}
      {exportTargetId ? (
        <OffscreenMindmapPngExport
          mindmapId={exportTargetId}
          onDone={() => setExportTargetId(null)}
        />
      ) : null}
    </>
  );
}
