export interface RefineCardSummary {
  id: string;
  front: string;
  back: string;
  deckId: string;
  deckName: string;
  reviewCount: number;
  lapseCount: number;
}

export interface RefineGroups {
  mastered: RefineCardSummary[];
  struggling: RefineCardSummary[];
}

export interface RefineMergeCandidate {
  id: string;
  front: string;
  back: string;
  deckId: string;
  deckName: string;
}

export type RefineProposalAction = "relate" | "merge";

export interface RefineMergeProposal {
  action: RefineProposalAction;
  front: string;
  back: string;
  sourceFlashcardIds: string[];
  rationale: string;
}
