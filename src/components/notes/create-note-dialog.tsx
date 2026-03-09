"use client";

import { createNote } from "@/app/actions/notes";
import { NoteDialogForm } from "@/components/notes/note-dialog-form";
import type { CreateNoteForm } from "@/features/notes/validation";

interface CreateNoteDialogProps {
  subjectId: string;
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCreateNoteFormValues(subjectId: string): CreateNoteForm {
  return {
    subjectId,
    title: "",
    content: "",
  };
}

export function CreateNoteDialog({
  subjectId,
  trigger,
  open,
  onOpenChange,
}: Readonly<CreateNoteDialogProps>) {
  return (
    <NoteDialogForm
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      values={getCreateNoteFormValues(subjectId)}
      onSubmitAction={(values) => createNote(values as CreateNoteForm)}
    />
  );
}
