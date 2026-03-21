"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { BulkDeleteFlashcardsDialog as BulkDeleteFlashcardsDialogType } from "@/components/flashcards/bulk-delete-flashcards-dialog";

type LazyBulkDeleteFlashcardsDialogProps = ComponentProps<
  typeof BulkDeleteFlashcardsDialogType
>;

export const LazyBulkDeleteFlashcardsDialog =
  dynamic<LazyBulkDeleteFlashcardsDialogProps>(
    () =>
      import("@/components/flashcards/bulk-delete-flashcards-dialog").then(
        (m) => m.BulkDeleteFlashcardsDialog,
      ),
    { ssr: false },
  );
