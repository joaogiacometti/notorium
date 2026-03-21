"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { BulkMoveFlashcardsDialog as BulkMoveFlashcardsDialogType } from "@/components/flashcards/bulk-move-flashcards-dialog";

type LazyBulkMoveFlashcardsDialogProps = ComponentProps<
  typeof BulkMoveFlashcardsDialogType
>;

export const LazyBulkMoveFlashcardsDialog =
  dynamic<LazyBulkMoveFlashcardsDialogProps>(
    () =>
      import("@/components/flashcards/bulk-move-flashcards-dialog").then(
        (m) => m.BulkMoveFlashcardsDialog,
      ),
    { ssr: false },
  );
