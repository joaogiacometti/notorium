import { toast } from "sonner";
import { setFlashcardStudyLater } from "@/app/actions/flashcards";
import type { FlashcardEntity } from "@/lib/server/api-contracts";
import {
  actionError,
  resolveActionErrorMessage,
} from "@/lib/server/server-action-errors";

/**
 * Flip a card's study-later mark outside a review session and hand the saved
 * mark to the caller; failures surface as a toast and skip `onSaved`.
 *
 * @example
 * void toggleStudyLater(row, () => refreshManagePage());
 */
export async function toggleStudyLater(
  card: Pick<FlashcardEntity, "id" | "studyLaterAt">,
  onSaved: (studyLaterAt: Date | null) => void,
): Promise<void> {
  try {
    const result = await setFlashcardStudyLater({
      id: card.id,
      studyLater: card.studyLaterAt === null,
    });
    if (!result.success) {
      toast.error(resolveActionErrorMessage(result));
      return;
    }
    onSaved(result.studyLaterAt);
  } catch {
    toast.error(resolveActionErrorMessage(actionError("common.generic")));
  }
}
