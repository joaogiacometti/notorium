"use client";

import { CreateFlashcardDialog } from "@/components/flashcards/dialogs/create-flashcard-dialog";
import { CreateFolderDialog } from "@/components/folders/create-folder-dialog";
import type { ContextFreeDialog } from "@/components/navbar/search-commands";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { CreatePdfDialog } from "@/components/pdfs/create-pdf-dialog";
import {
  getDocumentDetailHref,
  getNoteDetailHref,
} from "@/lib/navigation/detail-page-back-link";
import type { FolderOption } from "@/lib/server/api-contracts";

export type ActiveCreateDialog = ContextFreeDialog;

interface SearchCreateDialogsProps {
  activeDialog: ActiveCreateDialog | null;
  folderId: string | null;
  folders: FolderOption[];
  onClose: () => void;
  onNavigate: (href: string) => void;
}

/**
 * Renders the reusable create dialogs the search dialog commands open. Each dialog is
 * controlled by `activeDialog`; closing any of them clears the pending create state.
 */
export function SearchCreateDialogs({
  activeDialog,
  folderId,
  folders,
  onClose,
  onNavigate,
}: Readonly<SearchCreateDialogsProps>) {
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
    }
  }

  return (
    <>
      <CreateFolderDialog
        trigger={null}
        open={activeDialog === "folder"}
        onOpenChange={handleOpenChange}
      />
      <CreateFlashcardDialog
        open={activeDialog === "flashcard"}
        onOpenChange={handleOpenChange}
        folderId={folderId ?? undefined}
      />
      <CreateNoteTitleDialog
        folderId={folderId ?? undefined}
        folders={folders}
        open={activeDialog === "note"}
        onOpenChange={handleOpenChange}
        onSuccess={(noteId, createdFolderId) =>
          onNavigate(getNoteDetailHref(createdFolderId, noteId))
        }
      />
      <CreatePdfDialog
        folderId={folderId ?? undefined}
        folders={folders}
        open={activeDialog === "pdf"}
        onOpenChange={handleOpenChange}
        onSuccess={(pdfId, createdFolderId) =>
          onNavigate(
            getDocumentDetailHref({
              kind: "pdf",
              folderId: createdFolderId,
              id: pdfId,
            }),
          )
        }
      />
    </>
  );
}
