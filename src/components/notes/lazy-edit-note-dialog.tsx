"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { EditNoteDialog as EditNoteDialogType } from "@/components/notes/edit-note-dialog";

type LazyEditNoteDialogProps = ComponentProps<typeof EditNoteDialogType>;

export const LazyEditNoteDialog = dynamic<LazyEditNoteDialogProps>(
  () =>
    import("@/components/notes/edit-note-dialog").then((m) => m.EditNoteDialog),
  { ssr: false },
);
