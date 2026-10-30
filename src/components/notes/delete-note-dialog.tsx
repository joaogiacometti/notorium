"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import {
  DOCUMENT_KIND_ACTIONS,
  runDocumentAction,
} from "@/components/documents/document-kind-actions";

interface DeleteNoteDialogProps {
  noteId: string;
  noteTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteNoteDialog({
  noteId,
  noteTitle,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<DeleteNoteDialogProps>) {
  const queryClient = useQueryClient();

  return (
    <DeleteDocumentDialog
      kindLabel={DOCUMENT_KIND_ACTIONS.note.label}
      title={noteTitle}
      open={open}
      onOpenChange={onOpenChange}
      onDelete={() =>
        runDocumentAction(queryClient, () =>
          DOCUMENT_KIND_ACTIONS.note.remove(noteId),
        )
      }
      onSuccess={onSuccess}
    />
  );
}
