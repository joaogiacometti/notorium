import type { QueryClient } from "@tanstack/react-query";
import { setFlashcardStudyLater } from "@/app/actions/flashcards";
import { saveFlashcardMark } from "@/components/flashcards/shared/save-flashcard-mark";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

/**
 * Flip a card's study-later mark outside a review session and hand the saved
 * mark to the caller; failures surface as a toast and skip `onSaved`.
 *
 * @example
 * void toggleStudyLater(queryClient, row, onSaved);
 */
export async function toggleStudyLater(
  queryClient: QueryClient,
  card: Pick<FlashcardEntity, "id" | "studyLaterAt">,
  onSaved: (studyLaterAt: Date | null) => void,
): Promise<void> {
  const saved = await saveFlashcardMark(queryClient, () =>
    setFlashcardStudyLater({
      id: card.id,
      studyLater: card.studyLaterAt === null,
    }),
  );
  if (saved) onSaved(saved.studyLaterAt);
}
