"use client";

import { useState } from "react";
import { copyFlashcardsWithToast } from "@/components/flashcards/shared/copy-flashcards-with-toast";
import { fetchFlashcardContents } from "@/lib/read-api/flashcards";

interface FlashcardCopyControls {
  isCopying: boolean;
  copyFlashcardsById: (flashcardIds: string[]) => Promise<void>;
  copySelectedFlashcards: (
    rows: ReadonlyArray<{ id: string }>,
    selectedIds: readonly string[],
  ) => Promise<void>;
}

/**
 * Copies manage-view flashcards (row menus or the toolbar selection) as
 * Markdown. `isCopying` stays true until every copy started here finishes, so
 * a quick row copy cannot re-enable the toolbar while a bulk copy still loads.
 *
 * @example
 * const { isCopying, copySelectedFlashcards } = useFlashcardCopy();
 * void copySelectedFlashcards(pageRows, selectedFlashcardIds);
 */
export function useFlashcardCopy(): FlashcardCopyControls {
  const [pendingCopyCount, setPendingCopyCount] = useState(0);

  // The fetch is passed to the copy unawaited so the clipboard write still
  // starts inside the click (Safari drops writes that begin after an await).
  async function copyFlashcardsById(flashcardIds: string[]) {
    setPendingCopyCount((count) => count + 1);
    await copyFlashcardsWithToast(fetchFlashcardContents(flashcardIds));
    setPendingCopyCount((count) => count - 1);
  }

  // Copy selected cards in table order, not the order they were ticked.
  function copySelectedFlashcards(
    rows: ReadonlyArray<{ id: string }>,
    selectedIds: readonly string[],
  ) {
    const selected = new Set(selectedIds);
    const orderedIds = rows
      .filter((row) => selected.has(row.id))
      .map((row) => row.id);
    return copyFlashcardsById(orderedIds);
  }

  return {
    isCopying: pendingCopyCount > 0,
    copyFlashcardsById,
    copySelectedFlashcards,
  };
}
