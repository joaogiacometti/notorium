"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import {
  DOCUMENT_KIND_ACTIONS,
  runDocumentAction,
} from "@/components/documents/document-kind-actions";
import type { DocumentRowActionHandlers } from "@/components/documents/document-row-menu";
import { RenameDocumentDialog } from "@/components/documents/rename-document-dialog";
import type { DocumentListItem } from "@/features/documents/types";
import {
  copyNoteContentToClipboard,
  type NoteCopyFormat,
} from "@/lib/clipboard/note-content";
import { getDocumentDeleteRedirectHref } from "@/lib/navigation/delete-redirects";
import { fetchNoteById } from "@/lib/read-api/documents";

// Copies a note that is not open in the editor: its content is not in client
// state, so the last saved version is fetched before writing to the clipboard.
async function copySavedNoteContent(noteId: string, format: NoteCopyFormat) {
  try {
    const note = await fetchNoteById(noteId);
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
  /** Called after an edit or delete succeeds, so a caller with its own
   * client-side document state can reload that subject. Server-rendered views
   * need no refresh: the action's revalidation re-renders the current page in
   * the same response. */
  onChanged?: (item: DocumentListItem) => void;
}

interface DocumentRowDialogs {
  handlers: DocumentRowActionHandlers;
  dialogs: ReactNode;
}

/**
 * Owns the per-document action dialogs (rename/delete) for every kind plus the
 * note copy action, and returns the row-menu handlers wired to them. Shared by
 * the documents list sidebar and the subject tree so both expose identical
 * document actions on their kebab menus.
 *
 * @example
 * const { handlers, dialogs } = useDocumentRowDialogs({ onChanged });
 * return (<><DocumentRowMenu item={doc} {...handlers} />{dialogs}</>);
 */
export function useDocumentRowDialogs({
  onChanged,
}: Readonly<UseDocumentRowDialogsArgs>): DocumentRowDialogs {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<DocumentListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(
    null,
  );

  function handleDeleted(item: DocumentListItem) {
    onChanged?.(item);
    const redirectHref = getDocumentDeleteRedirectHref(pathname, item);
    if (redirectHref) {
      router.push(redirectHref);
    }
  }

  const handlers: DocumentRowActionHandlers = {
    onEditRequested: (item) => setEditTarget(item),
    onDeleteRequested: (item) => setDeleteTarget(item),
    onCopyRequested: (item, format) =>
      void copySavedNoteContent(item.id, format),
  };

  function closeEdit(open: boolean) {
    if (!open) setEditTarget(null);
  }

  function closeDelete(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function finishEdit(target: DocumentListItem) {
    setEditTarget(null);
    onChanged?.(target);
  }

  function finishDelete(target: DocumentListItem) {
    setDeleteTarget(null);
    handleDeleted(target);
  }

  const dialogs = (
    <>
      {editTarget ? (
        <RenameDocumentDialog
          kindLabel={DOCUMENT_KIND_ACTIONS[editTarget.kind].label}
          title={editTarget.title}
          titleSchema={DOCUMENT_KIND_ACTIONS[editTarget.kind].titleSchema}
          open
          onOpenChange={closeEdit}
          onRename={(title) =>
            runDocumentAction(editTarget.kind, queryClient, () =>
              DOCUMENT_KIND_ACTIONS[editTarget.kind].rename(
                editTarget.id,
                title,
              ),
            )
          }
          onSuccess={() => finishEdit(editTarget)}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteDocumentDialog
          kindLabel={DOCUMENT_KIND_ACTIONS[deleteTarget.kind].label}
          title={deleteTarget.title}
          open
          onOpenChange={closeDelete}
          onDelete={() =>
            runDocumentAction(deleteTarget.kind, queryClient, () =>
              DOCUMENT_KIND_ACTIONS[deleteTarget.kind].remove(deleteTarget.id),
            )
          }
          onSuccess={() => finishDelete(deleteTarget)}
        />
      ) : null}
    </>
  );

  return { handlers, dialogs };
}
