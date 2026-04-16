"use client";

import { editNote } from "@/app/actions/notes";
import { NoteDialogForm } from "@/components/notes/note-dialog-form";
import type { EditNoteForm } from "@/features/notes/validation";
import type { NoteEditDto } from "@/lib/server/api-contracts";

interface EditNoteDialogProps {
  note: NoteEditDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
}

function getEditNoteFormValues(note: NoteEditDto): EditNoteForm {
  return {
    id: note.id,
    title: note.title,
    content: note.content ?? "",
  };
}

export function EditNoteDialog({
  note,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<EditNoteDialogProps>) {
  return (
    <NoteDialogForm
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      values={getEditNoteFormValues(note)}
      onSubmitAction={(values) => editNote(values as EditNoteForm)}
    />
  );
}
