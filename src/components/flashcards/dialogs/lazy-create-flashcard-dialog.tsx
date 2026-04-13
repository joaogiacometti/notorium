"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CreateFlashcardDialog as CreateFlashcardDialogType } from "@/components/flashcards/dialogs/create-flashcard-dialog";

type LazyCreateFlashcardDialogProps = ComponentProps<
  typeof CreateFlashcardDialogType
>;

export const LazyCreateFlashcardDialog =
  dynamic<LazyCreateFlashcardDialogProps>(
    () =>
      import("@/components/flashcards/dialogs/create-flashcard-dialog").then(
        (m) => m.CreateFlashcardDialog,
      ),
    { ssr: false },
  );
