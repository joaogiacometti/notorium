"use client";

import type { ReactNode } from "react";
import { LazyCreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { CreatePdfDialog } from "@/components/pdfs/create-pdf-dialog";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import type {
  DocumentCreateTarget,
  SubjectDeleteTarget,
  SubjectEditTarget,
} from "@/components/subjects/tree/subject-tree-types";
import type { DocumentKind } from "@/features/documents/types";

interface SubjectTreeDialogsProps {
  /** Shared document kebab dialog host rendered alongside the tree dialogs. */
  documentDialogs: ReactNode;
  aiEnabled: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  createParentId?: string;
  onSubjectCreated: () => void;
  editTarget: SubjectEditTarget | null;
  onEditTargetChange: (target: SubjectEditTarget | null) => void;
  deleteTarget: SubjectDeleteTarget | null;
  onDeleteTargetChange: (target: SubjectDeleteTarget | null) => void;
  createDocumentTarget: DocumentCreateTarget | null;
  onCreateDocumentTargetChange: (target: DocumentCreateTarget | null) => void;
  onDocumentCreated: (documentId: string) => void;
  createFlashcardSubjectId: string | null;
  onCreateFlashcardSubjectIdChange: (id: string | null) => void;
  /** Re-fetch tree counts after a mutating dialog completes. */
  onRefreshTree: () => void;
  onSubjectDeleted: (subjectId: string) => void;
}

/**
 * Renders every dialog the subject tree can open (create/edit/delete subject,
 * create note/PDF/flashcard) plus the shared
 * document kebab dialog host. Split out of `subject-tree-sidebar.tsx` to keep
 * that file focused on tree state and within the file-size guard.
 */
export function SubjectTreeDialogs({
  documentDialogs,
  aiEnabled,
  createOpen,
  onCreateOpenChange,
  createParentId,
  onSubjectCreated,
  editTarget,
  onEditTargetChange,
  deleteTarget,
  onDeleteTargetChange,
  createDocumentTarget,
  onCreateDocumentTargetChange,
  onDocumentCreated,
  createFlashcardSubjectId,
  onCreateFlashcardSubjectIdChange,
  onRefreshTree,
  onSubjectDeleted,
}: Readonly<SubjectTreeDialogsProps>) {
  return (
    <>
      {documentDialogs}

      <CreateSubjectDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        parentSubjectId={createParentId}
        onCreated={onSubjectCreated}
      />

      {editTarget ? (
        <EditSubjectDialog
          subject={editTarget}
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
        <DeleteSubjectDialog
          subjectId={deleteTarget.id}
          subjectName={deleteTarget.name}
          open
          onOpenChange={(open) => {
            if (!open) {
              onDeleteTargetChange(null);
            }
          }}
          onSuccess={() => {
            const deletedSubjectId = deleteTarget.id;
            onDeleteTargetChange(null);
            onSubjectDeleted(deletedSubjectId);
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
        subjectId={createFlashcardSubjectId ?? undefined}
        open={createFlashcardSubjectId !== null}
        onOpenChange={(open) => {
          if (!open) {
            onCreateFlashcardSubjectIdChange(null);
          }
        }}
        aiEnabled={aiEnabled}
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
      subjectId={target.subjectId}
      open
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}
