import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  bulkSetFlashcardsStudyLater,
  setFlashcardsArchived,
} from "@/app/actions/flashcards";
import { invalidateFlashcardViews } from "@/lib/client-cache/invalidation";
import {
  type ActionErrorResult,
  actionError,
  resolveActionErrorMessage,
} from "@/lib/server/server-action-errors";

/**
 * Run a card-mark write (study later, archive) outside a review session and
 * refresh flashcard caches. Failures surface as a toast and resolve to null,
 * so callers only handle the saved outcome.
 *
 * @example
 * const saved = await saveFlashcardMark(queryClient, () => setFlashcardsArchived(input));
 */
export async function saveFlashcardMark<T extends { success: true }>(
  queryClient: QueryClient,
  write: () => Promise<T | ActionErrorResult>,
): Promise<T | null> {
  try {
    const result = await write();
    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      return null;
    }
    await invalidateFlashcardViews(queryClient);
    return result;
  } catch {
    toast.error(resolveActionErrorMessage(actionError("common.generic")));
    return null;
  }
}

export function saveFlashcardsArchived(
  queryClient: QueryClient,
  ids: string[],
  archived: boolean,
) {
  return saveFlashcardMark(queryClient, () =>
    setFlashcardsArchived({ ids, archived }),
  );
}

export function saveFlashcardsStudyLater(
  queryClient: QueryClient,
  ids: string[],
  studyLater: boolean,
) {
  return saveFlashcardMark(queryClient, () =>
    bulkSetFlashcardsStudyLater({ ids, studyLater }),
  );
}
