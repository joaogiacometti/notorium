"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { BulkResetFlashcardsDialog as BulkResetFlashcardsDialogType } from "@/components/flashcards/manage/bulk-reset-flashcards-dialog";

type LazyBulkResetFlashcardsDialogProps = ComponentProps<
  typeof BulkResetFlashcardsDialogType
>;

export const LazyBulkResetFlashcardsDialog =
  dynamic<LazyBulkResetFlashcardsDialogProps>(
    () =>
      import(
        "@/components/flashcards/manage/bulk-reset-flashcards-dialog"
      ).then((m) => m.BulkResetFlashcardsDialog),
    { ssr: false },
  );
