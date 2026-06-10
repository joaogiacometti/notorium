"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateFlashcardBack } from "@/app/actions/flashcards";
import { proposeFlashcardMerge } from "@/app/actions/flashcards-refine";
import type {
  RefineCardSummary,
  RefineMergeCandidate,
  RefineMergeProposal,
} from "@/features/flashcards/refine/types";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

export interface ActiveMergeProposal {
  card: RefineCardSummary;
  proposal: RefineMergeProposal;
  sources: RefineMergeCandidate[];
}

export interface ActiveImproveProposal {
  card: RefineCardSummary;
  proposedBack: string;
}

/**
 * Per-card AI actions for the manage refine mode: propose a level-up
 * merge for a mastered card or an improved back for a struggling card.
 * The active proposal drives the merge/improve preview dialogs.
 *
 * Example: const { handleProposeMerge } = useRefineCardActions();
 */
export function useRefineCardActions() {
  const [proposingCardId, setProposingCardId] = useState<string | null>(null);
  const [activeMerge, setActiveMerge] = useState<ActiveMergeProposal | null>(
    null,
  );
  const [improvingCardId, setImprovingCardId] = useState<string | null>(null);
  const [activeImprove, setActiveImprove] =
    useState<ActiveImproveProposal | null>(null);

  async function handleImproveCard(card: RefineCardSummary) {
    setImprovingCardId(card.id);

    try {
      const result = await generateFlashcardBack({
        deckId: card.deckId,
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

  async function handleProposeMerge(card: RefineCardSummary) {
    setProposingCardId(card.id);

    try {
      const result = await proposeFlashcardMerge({ flashcardId: card.id });

      if (!result.success) {
        // A declined merge means the card is already good — not a failure.
        if (result.errorCode === "flashcards.merge.declined") {
          toast.info(resolveActionErrorMessage(result));
        } else {
          toast.error(resolveActionErrorMessage(result));
        }
        return;
      }

      setActiveMerge({
        card,
        proposal: result.proposal,
        sources: result.sources,
      });
    } finally {
      setProposingCardId(null);
    }
  }

  return {
    proposingCardId,
    improvingCardId,
    activeMerge,
    activeImprove,
    setActiveMerge,
    setActiveImprove,
    handleProposeMerge,
    handleImproveCard,
  };
}
