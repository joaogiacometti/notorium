"use client";

import { editNote } from "@/app/actions/notes";
import { NoteDialogForm } from "@/components/note-dialog-form";
import type { NoteEditDto } from "@/lib/api/contracts";
import type { EditNoteForm } from "@/lib/validations/notes";

interface EditNoteDialogProps {
  note: NoteEditDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}: Readonly<EditNoteDialogProps>) {
  return (
    <NoteDialogForm
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      values={getEditNoteFormValues(note)}
      onSubmitAction={(values) => editNote(values as EditNoteForm)}
    />
  );
}
