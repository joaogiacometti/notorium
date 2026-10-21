"use client";

import { useState } from "react";
import { toast } from "sonner";
import { improveFlashcardBack } from "@/app/actions/flashcards";
import type { StrugglingFlashcard } from "@/features/flashcards/refine/types";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

export interface ActiveImproveProposal {
  card: StrugglingFlashcard;
  proposedBack: string;
}

/**
 * The per-card AI action for the manage refine mode: propose an improved back
 * for a struggling card. The active proposal drives the improve preview dialog.
 *
 * Example: const { handleImproveCard } = useRefineCardActions();
 */
export function useRefineCardActions() {
  const [improvingCardId, setImprovingCardId] = useState<string | null>(null);
  const [activeImprove, setActiveImprove] =
    useState<ActiveImproveProposal | null>(null);

  async function handleImproveCard(card: StrugglingFlashcard) {
    setImprovingCardId(card.id);

    try {
      const result = await improveFlashcardBack({
        subjectId: card.subjectId ?? "",
        front: card.front,
        currentBack: card.back,
      });

      if (!result.success) {
        toast.error(resolveActionErrorMessage(result));
        return;
      }

      setActiveImprove({ card, proposedBack: result.back });
    } finally {
      setImprovingCardId(null);
    }
  }

  return {
    improvingCardId,
    activeImprove,
    setActiveImprove,
    handleImproveCard,
  };
}
