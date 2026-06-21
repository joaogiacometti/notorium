"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { getNoteById } from "@/app/actions/notes";
import type { DocumentRowActionHandlers } from "@/components/documents/document-row-menu";
import { DeleteBookDialog } from "@/components/library/delete-book-dialog";
import { EditBookDialog } from "@/components/library/edit-book-dialog";
import { DeleteMindmapDialog } from "@/components/mindmaps/delete-mindmap-dialog";
import { EditMindmapTitleDialog } from "@/components/mindmaps/edit-mindmap-title-dialog";
import { GenerateMindmapFlashcardsDialog } from "@/components/mindmaps/generate-mindmap-flashcards-dialog";
import { OffscreenMindmapPngExport } from "@/components/mindmaps/offscreen-mindmap-png-export";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { EditNoteTitleDialog } from "@/components/notes/edit-note-title-dialog";
import { GenerateNoteFlashcardsDialog } from "@/components/notes/generate-note-flashcards-dialog";
import type { DocumentListItem } from "@/features/documents/types";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import type { SubjectOption } from "@/lib/server/api-contracts";

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

interface UseDocumentRowDialogsArgs {
  aiEnabled: boolean;
  subjects: SubjectOption[];
  /** Called after an edit or delete succeeds, before `router.refresh()`, so a
   * caller with its own client-side document state can reload that subject. */
  onChanged?: (item: DocumentListItem) => void;
}

interface DocumentRowDialogs {
  handlers: DocumentRowActionHandlers;
  dialogs: ReactNode;
}

/**
 * Owns the per-document action dialogs (edit/delete/generate/export) plus the
 * note copy action, and returns the row-menu handlers wired to them. Shared by
 * the documents list sidebar and the subject tree so both expose identical
 * document actions on their kebab menus.
 *
 * @example
 * const { handlers, dialogs } = useDocumentRowDialogs({ aiEnabled, subjects });
 * return (<><DocumentRowMenu item={doc} {...handlers} />{dialogs}</>);
 */
export function useDocumentRowDialogs({
  aiEnabled,
  subjects,
  onChanged,
}: Readonly<UseDocumentRowDialogsArgs>): DocumentRowDialogs {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<DocumentListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(
    null,
  );
  const [generateTarget, setGenerateTarget] = useState<DocumentListItem | null>(
    null,
  );
  const [exportTargetId, setExportTargetId] = useState<string | null>(null);

  function handleChanged(item: DocumentListItem) {
    onChanged?.(item);
    router.refresh();
  }

  const handlers: DocumentRowActionHandlers = {
    onEditRequested: (item) => setEditTarget(item),
    onDeleteRequested: (item) => setDeleteTarget(item),
    onCopyRequested: (item, format) =>
      void copySavedNoteContent(item.id, format),
    onGenerateRequested: aiEnabled
      ? (item) => setGenerateTarget(item)
      : undefined,
    generateDisabledReason:
      subjects.length > 0
        ? undefined
        : "Create a subject before generating flashcards.",
    onExportRequested: (item) => setExportTargetId(item.id),
  };

  const dialogs = (
    <>
      {editTarget?.kind === "note" ? (
        <EditNoteTitleDialog
          note={{ id: editTarget.id, title: editTarget.title }}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSuccess={() => {
            const target = editTarget;
            setEditTarget(null);
            handleChanged(target);
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
          onSuccess={() => {
            const target = editTarget;
            setEditTarget(null);
            handleChanged(target);
          }}
        />
      ) : null}
      {editTarget?.kind === "book" ? (
        <EditBookDialog
          book={{
            id: editTarget.id,
            title: editTarget.title,
            author: editTarget.author ?? null,
          }}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSaved={() => {
            const target = editTarget;
            setEditTarget(null);
            handleChanged(target);
          }}
        />
      ) : null}
      {deleteTarget?.kind === "book" ? (
        <DeleteBookDialog
          bookId={deleteTarget.id}
          bookTitle={deleteTarget.title}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleted={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            handleChanged(target);
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
            const target = deleteTarget;
            setDeleteTarget(null);
            handleChanged(target);
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
            const target = deleteTarget;
            setDeleteTarget(null);
            handleChanged(target);
          }}
        />
      ) : null}
      {generateTarget?.kind === "note" ? (
        <GenerateNoteFlashcardsDialog
          subjects={subjects}
          noteId={generateTarget.id}
          open
          onOpenChange={(open) => {
            if (!open) setGenerateTarget(null);
          }}
        />
      ) : null}
      {generateTarget?.kind === "mindmap" ? (
        <GenerateMindmapFlashcardsDialog
          subjects={subjects}
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

  return { handlers, dialogs };
}
