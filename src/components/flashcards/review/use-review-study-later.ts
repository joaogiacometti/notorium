"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setFlashcardStudyLater } from "@/app/actions/flashcards";
import { setFlashcardStudyLaterInState } from "@/features/flashcard-review/state";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface UseReviewStudyLaterParams {
  readReviewState: () => FlashcardReviewState;
  commitReturnedReviewState: (nextState: FlashcardReviewState) => void;
}

/**
 * Toggles a review card's study-later mark optimistically: marking sends the
 * card to the end of the queue at once, the save runs in the background, and
 * a failed save puts the previous mark back with a toast.
 *
 * @example
 * const studyLater = useReviewStudyLater({ readReviewState, commitReturnedReviewState });
 * studyLater.toggleReviewCardStudyLater(currentCard);
 */
export function useReviewStudyLater({
  readReviewState,
  commitReturnedReviewState,
}: UseReviewStudyLaterParams) {
  const [pendingStudyLaterCount, setPendingStudyLaterCount] = useState(0);

  // Only the marked/unmarked side matters: a save that confirms the side the
  // queue already shows is a no-op, while one landing after a refetch that
  // lost the optimistic mark re-applies it.
  function applyStudyLater(cardId: string, studyLaterAt: Date | null) {
    const state = readReviewState();
    const card = state.cards.find((queued) => queued.id === cardId);
    if (!card || (card.studyLaterAt === null) === (studyLaterAt === null)) {
      return;
    }

    commitReturnedReviewState(
      setFlashcardStudyLaterInState(state, cardId, studyLaterAt),
    );
  }

  function toggleReviewCardStudyLater(card: FlashcardReviewEntity) {
    const studyLaterAt = card.studyLaterAt ? null : new Date();
    applyStudyLater(card.id, studyLaterAt);
    void saveStudyLater(card, studyLaterAt !== null);
  }

  async function saveStudyLater(
    card: FlashcardReviewEntity,
    studyLater: boolean,
  ) {
    setPendingStudyLaterCount((count) => count + 1);
    try {
      const result = await setFlashcardStudyLater({ id: card.id, studyLater });
      if (result.success) {
        applyStudyLater(card.id, result.studyLaterAt);
        return;
      }
      toast.error(t(result.errorCode, result.errorParams));
    } catch {
      toast.error("Could not save Study later. Please try again.");
    } finally {
      setPendingStudyLaterCount((count) => count - 1);
    }
    applyStudyLater(card.id, card.studyLaterAt);
  }

  return { toggleReviewCardStudyLater, pendingStudyLaterCount };
}
