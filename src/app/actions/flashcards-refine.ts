"use server";

import { revalidatePath } from "next/cache";
import { synthesizeRefineProposalForUser } from "@/features/flashcards/ai-service";
import { getFlashcardDetailByIdForUser } from "@/features/flashcards/queries";
import { applyRefineProposalForUser } from "@/features/flashcards/refine/mutations";
import {
  findSimilarFlashcardsForUser,
  getRefineGroupsForUser,
} from "@/features/flashcards/refine/queries";
import type {
  RefineGroups,
  RefineMergeCandidate,
  RefineMergeProposal,
} from "@/features/flashcards/refine/types";
import {
  type ApplyFlashcardMergeForm,
  applyFlashcardMergeSchema,
  type ProposeFlashcardMergeForm,
  proposeFlashcardMergeSchema,
} from "@/features/flashcards/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { FlashcardEntity } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type GetRefineFlashcardGroupsResult =
  | { success: true; groups: RefineGroups }
  | ActionErrorResult;

/**
 * Load the manage refine mode groups (mastered and struggling cards) for
 * the authenticated user.
 *
 * Example: const result = await getRefineFlashcardGroups();
 */
export async function getRefineFlashcardGroups(): Promise<GetRefineFlashcardGroupsResult> {
  const userId = await getAuthenticatedUserId();
  const groups = await getRefineGroupsForUser(userId);

  return { success: true, groups };
}

export type ProposeFlashcardMergeResult =
  | {
      success: true;
      proposal: RefineMergeProposal;
      sources: RefineMergeCandidate[];
    }
  | ActionErrorResult;

/**
 * Find similar cards for a mastered card and ask the AI to propose a level-up:
 * a new relationship card or a merge of true duplicates. Read-only: nothing
 * is written until the user accepts.
 *
 * Example: const result = await proposeFlashcardMerge({ flashcardId });
 */
export async function proposeFlashcardMerge(
  data: ProposeFlashcardMergeForm,
): Promise<ProposeFlashcardMergeResult> {
  return runValidatedUserAction(
    proposeFlashcardMergeSchema,
    data,
    "flashcards.merge.invalidData",
    async (userId, parsedData) => {
      const primary = await getFlashcardDetailByIdForUser(
        userId,
        parsedData.flashcardId,
      );

      if (!primary) {
        return actionError("flashcards.notFound");
      }

      const candidates = await findSimilarFlashcardsForUser(userId, primary);

      if (candidates.length === 0) {
        return actionError("flashcards.merge.noCandidates");
      }

      const synthesis = await synthesizeRefineProposalForUser({
        userId,
        primary: {
          id: primary.id,
          front: primary.front,
          back: primary.back,
          subjectName: primary.subjectName,
        },
        candidates,
      });

      if (!synthesis.success) {
        return actionError(synthesis.errorCode);
      }

      const selectedIds = new Set(synthesis.synthesis.sourceFlashcardIds);
      const sources = candidates.filter((candidate) =>
        selectedIds.has(candidate.id),
      );

      if (sources.length === 0) {
        return actionError("flashcards.merge.noCandidates");
      }

      return { success: true, proposal: synthesis.synthesis, sources };
    },
  );
}

export type ApplyFlashcardMergeResult =
  | { success: true; flashcard: FlashcardEntity; deletedIds: string[] }
  | ActionErrorResult;

/**
 * Apply an accepted refine proposal. Relate: create the new relationship card,
 * keeping the originals. Merge: create the synthesis card, log lineage, and
 * delete the source cards.
 *
 * Example: const result = await applyFlashcardMerge(mergeForm);
 */
export async function applyFlashcardMerge(
  data: ApplyFlashcardMergeForm,
): Promise<ApplyFlashcardMergeResult> {
  const result = await runValidatedUserAction(
    applyFlashcardMergeSchema,
    data,
    "flashcards.merge.invalidData",
    async (userId, parsedData) =>
      applyRefineProposalForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}
