"use client";

import type { ReactNode } from "react";
import { LazyCreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { CreateFolderDialog } from "@/components/folders/create-folder-dialog";
import { DeleteFolderDialog } from "@/components/folders/delete-folder-dialog";
import { EditFolderDialog } from "@/components/folders/edit-folder-dialog";
import type {
  DocumentCreateTarget,
  FolderDeleteTarget,
  FolderEditTarget,
} from "@/components/folders/tree/folder-tree-types";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { CreatePdfDialog } from "@/components/pdfs/create-pdf-dialog";
import type { DocumentKind } from "@/features/documents/types";

interface FolderTreeDialogsProps {
  /** Shared document kebab dialog host rendered alongside the tree dialogs. */
  documentDialogs: ReactNode;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  createParentId?: string;
  onFolderCreated: () => void;
  editTarget: FolderEditTarget | null;
  onEditTargetChange: (target: FolderEditTarget | null) => void;
  deleteTarget: FolderDeleteTarget | null;
  onDeleteTargetChange: (target: FolderDeleteTarget | null) => void;
  createDocumentTarget: DocumentCreateTarget | null;
  onCreateDocumentTargetChange: (target: DocumentCreateTarget | null) => void;
  onDocumentCreated: (documentId: string) => void;
  createFlashcardFolderId: string | null;
  onCreateFlashcardFolderIdChange: (id: string | null) => void;
  /** Re-fetch tree counts after a mutating dialog completes. */
  onRefreshTree: () => void;
  onFolderDeleted: (folderId: string) => void;
}

/**
 * Renders every dialog the folder tree can open (create/edit/delete folder,
 * create note/PDF/flashcard) plus the shared
 * document kebab dialog host. Split out of `folder-tree-sidebar.tsx` to keep
 * that file focused on tree state and within the file-size guard.
 */
export function FolderTreeDialogs({
  documentDialogs,
  createOpen,
  onCreateOpenChange,
  createParentId,
  onFolderCreated,
  editTarget,
  onEditTargetChange,
  deleteTarget,
  onDeleteTargetChange,
  createDocumentTarget,
  onCreateDocumentTargetChange,
  onDocumentCreated,
  createFlashcardFolderId,
  onCreateFlashcardFolderIdChange,
  onRefreshTree,
  onFolderDeleted,
}: Readonly<FolderTreeDialogsProps>) {
  return (
    <>
      {documentDialogs}

      <CreateFolderDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        parentFolderId={createParentId}
        onCreated={onFolderCreated}
      />

      {editTarget ? (
        <EditFolderDialog
          folder={editTarget}
          open
          onOpenChange={(open) => {
            if (!open) {
              onEditTargetChange(null);
            }
          }}
          onSaved={() => {
            onEditTargetChange(null);
            onRefreshTree();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteFolderDialog
          folderId={deleteTarget.id}
          folderName={deleteTarget.name}
          open
          onOpenChange={(open) => {
            if (!open) {
              onDeleteTargetChange(null);
            }
          }}
          onSuccess={() => {
            const deletedFolderId = deleteTarget.id;
            onDeleteTargetChange(null);
            onFolderDeleted(deletedFolderId);
          }}
        />
      ) : null}

      {createDocumentTarget ? (
        <CreateDocumentDialog
          target={createDocumentTarget}
          onOpenChange={(open) => {
            if (!open) {
              onCreateDocumentTargetChange(null);
            }
          }}
          onSuccess={onDocumentCreated}
        />
      ) : null}

      <LazyCreateFlashcardDialog
        folderId={createFlashcardFolderId ?? undefined}
        open={createFlashcardFolderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            onCreateFlashcardFolderIdChange(null);
          }
        }}
      />
    </>
  );
}

const CREATE_DOCUMENT_DIALOGS = {
  note: CreateNoteTitleDialog,
  pdf: CreatePdfDialog,
} satisfies Record<DocumentKind, unknown>;

interface CreateDocumentDialogProps {
  target: DocumentCreateTarget;
  onOpenChange: (open: boolean) => void;
  onSuccess: (documentId: string) => void;
}

function CreateDocumentDialog({
  target,
  onOpenChange,
  onSuccess,
}: Readonly<CreateDocumentDialogProps>) {
  const Dialog = CREATE_DOCUMENT_DIALOGS[target.kind];
  return (
    <Dialog
      folderId={target.folderId}
      open
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}
