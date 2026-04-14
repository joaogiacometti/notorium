"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { EditFlashcardDialog as EditFlashcardDialogType } from "@/components/flashcards/dialogs/edit-flashcard-dialog";

type LazyEditFlashcardDialogProps = ComponentProps<
  typeof EditFlashcardDialogType
>;

export const LazyEditFlashcardDialog = dynamic<LazyEditFlashcardDialogProps>(
  () =>
    import("@/components/flashcards/dialogs/edit-flashcard-dialog").then(
      (m) => m.EditFlashcardDialog,
    ),
  { ssr: false },
);
