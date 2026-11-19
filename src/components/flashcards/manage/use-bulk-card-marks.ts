"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import {
  saveFlashcardsArchived,
  saveFlashcardsStudyLater,
} from "@/components/flashcards/shared/save-flashcard-mark";
import type { FlashcardManageItem } from "@/lib/server/api-contracts";

/** What the bulk Study later button does; null when no selected card can take it. */
export type BulkStudyLaterIntent = "mark" | "clear" | null;
export type BulkArchiveIntent = "archive" | "unarchive";

type MarkableItem = Pick<
  FlashcardManageItem,
  "id" | "studyLaterAt" | "archivedAt"
>;

/**
 * Bulk buttons act like a toggle over the selection: they set the mark unless
 * every eligible card already has it, in which case they clear it. Archived
 * cards cannot take a study-later mark (the server skips them), so they do
 * not count toward it.
 *
 * @example
 * resolveBulkMarkIntents(selectedRows); // { studyLater: "mark", archive: "archive" }
 */
export function resolveBulkMarkIntents(selected: MarkableItem[]): {
  studyLater: BulkStudyLaterIntent;
  archive: BulkArchiveIntent;
} {
  const active = selected.filter((card) => card.archivedAt === null);
  let studyLater: BulkStudyLaterIntent = null;
  if (active.length > 0) {
    studyLater = active.every((card) => card.studyLaterAt !== null)
      ? "clear"
      : "mark";
  }
  const allArchived =
    selected.length > 0 && selected.every((card) => card.archivedAt !== null);

  return { studyLater, archive: allArchived ? "unarchive" : "archive" };
}

export type BulkCardMarks = ReturnType<typeof useBulkCardMarks>;

/**
 * Bulk Study later and Archive for the manage table's current selection.
 *
 * @example
 * const marks = useBulkCardMarks({ flashcards, selectedIds, onSaved: clearSelection });
 */
export function useBulkCardMarks({
  flashcards,
  selectedIds,
  onSaved,
}: Readonly<{
  flashcards: FlashcardManageItem[];
  selectedIds: string[];
  onSaved: () => void;
}>) {
  const queryClient = useQueryClient();
  const [isSaving, startTransition] = useTransition();
  const selectedIdSet = new Set(selectedIds);
  const selected = flashcards.filter((card) => selectedIdSet.has(card.id));
  const ids = selected.map((card) => card.id);
  const intents = resolveBulkMarkIntents(selected);

  function run(save: () => Promise<unknown>) {
    if (ids.length === 0) return;
    startTransition(async () => {
      if (await save()) onSaved();
    });
  }

  return {
    intents,
    isSaving,
    applyStudyLater: () => {
      if (intents.studyLater === null) return;
      const studyLater = intents.studyLater === "mark";
      run(() => saveFlashcardsStudyLater(queryClient, ids, studyLater));
    },
    applyArchive: () =>
      run(() =>
        saveFlashcardsArchived(queryClient, ids, intents.archive === "archive"),
      ),
  };
}
