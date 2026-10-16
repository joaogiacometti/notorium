"use server";

import { revalidatePath } from "next/cache";
import { validateFlashcardsForUser } from "@/features/flashcards/ai-service";
import {
  bulkDeleteFlashcardsForUser,
  bulkMoveFlashcardsForUser,
  bulkResetFlashcardsForUser,
  createFlashcardForUser,
  deleteFlashcardForUser,
  editFlashcardForUser,
  generateFlashcardBackForUserInput,
  resetFlashcardForUser,
} from "@/features/flashcards/mutations";
import {
  getFlashcardsByIdsForValidation,
  hasDuplicateFlashcardFrontForUser,
} from "@/features/flashcards/queries";
import { splitFlashcardForUser } from "@/features/flashcards/split-mutation";
import {
  type BulkDeleteFlashcardsForm,
  type BulkMoveFlashcardsForm,
  type BulkResetFlashcardsForm,
  bulkDeleteFlashcardsSchema,
  bulkMoveFlashcardsSchema,
  bulkResetFlashcardsSchema,
  type CheckFlashcardDuplicateForm,
  type CreateFlashcardForm as CreateFlashcardInput,
  checkFlashcardDuplicateSchema,
  createFlashcardSchema as createFlashcardInputSchema,
  type DeleteFlashcardForm,
  deleteFlashcardSchema,
  type EditFlashcardForm,
  editFlashcardSchema,
  type GenerateFlashcardBackForm,
  generateFlashcardBackSchema,
  type ResetFlashcardForm,
  resetFlashcardSchema,
  type SplitFlashcardForm,
  splitFlashcardSchema,
  type ValidateFlashcardsForm,
  validateFlashcardsSchema,
} from "@/features/flashcards/validation";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  BulkDeleteFlashcardsResult,
  BulkMoveFlashcardsResult,
  BulkResetFlashcardsResult,
  CheckFlashcardDuplicateResult,
  CreateFlashcardResult,
  DeleteFlashcardResult,
  EditFlashcardResult,
  GenerateFlashcardBackResult,
  ResetFlashcardResult,
  SplitFlashcardResult,
} from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export async function createFlashcard(
  data: CreateFlashcardInput,
): Promise<CreateFlashcardResult> {
  const result = await runValidatedUserAction(
    "flashcards.createFlashcard",
    createFlashcardInputSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => createFlashcardForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}

export async function checkFlashcardDuplicate(
  data: CheckFlashcardDuplicateForm,
): Promise<CheckFlashcardDuplicateResult> {
  return runValidatedUserAction(
    "flashcards.checkFlashcardDuplicate",
    checkFlashcardDuplicateSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => {
      const duplicate = await hasDuplicateFlashcardFrontForUser(
        userId,
        normalizeRichTextForUniqueness(parsedData.front),
        parsedData.id,
      );

      return { success: true, duplicate };
    },
  );
}

export async function editFlashcard(
  data: EditFlashcardForm,
): Promise<EditFlashcardResult> {
  const result = await runValidatedUserAction(
    "flashcards.editFlashcard",
    editFlashcardSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => editFlashcardForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}

export async function generateFlashcardBack(
  data: GenerateFlashcardBackForm,
): Promise<GenerateFlashcardBackResult> {
  return runValidatedUserAction(
    "flashcards.generateFlashcardBack",
    generateFlashcardBackSchema,
    data,
    "flashcards.ai.invalidData",
    (userId, parsedData) =>
      generateFlashcardBackForUserInput(userId, parsedData),
  );
}

export async function deleteFlashcard(
  data: DeleteFlashcardForm,
): Promise<DeleteFlashcardResult> {
  const result = await runValidatedUserAction(
    "flashcards.deleteFlashcard",
    deleteFlashcardSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => {
      const mutationResult = await deleteFlashcardForUser(userId, parsedData);

      if (mutationResult.success !== true) {
        return mutationResult;
      }

      return {
        success: true as const,
        id: parsedData.id,
        subjectId: mutationResult.subjectId,
      };
    },
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}

export async function bulkDeleteFlashcards(
  data: BulkDeleteFlashcardsForm,
): Promise<BulkDeleteFlashcardsResult> {
  const result = await runValidatedUserAction(
    "flashcards.bulkDeleteFlashcards",
    bulkDeleteFlashcardsSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) =>
      bulkDeleteFlashcardsForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}

export async function bulkMoveFlashcards(
  data: BulkMoveFlashcardsForm,
): Promise<BulkMoveFlashcardsResult> {
  const result = await runValidatedUserAction(
    "flashcards.bulkMoveFlashcards",
    bulkMoveFlashcardsSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => bulkMoveFlashcardsForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}

export async function bulkResetFlashcards(
  data: BulkResetFlashcardsForm,
): Promise<BulkResetFlashcardsResult> {
  const result = await runValidatedUserAction(
    "flashcards.bulkResetFlashcards",
    bulkResetFlashcardsSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) =>
      bulkResetFlashcardsForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}

export async function resetFlashcard(
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  const result = await runValidatedUserAction(
    "flashcards.resetFlashcard",
    resetFlashcardSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => resetFlashcardForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}

export async function splitFlashcard(
  data: SplitFlashcardForm,
): Promise<SplitFlashcardResult> {
  const result = await runValidatedUserAction(
    "flashcards.splitFlashcard",
    splitFlashcardSchema,
    data,
    "flashcards.invalidData",
    splitFlashcardForUser,
  );
  if (result.success) {
    revalidatePath("/flashcards");
  }
  return result;
}

export async function validateFlashcards(data: ValidateFlashcardsForm): Promise<
  | {
      success: true;
      issues: Array<{
        id: string;
        issueType: "incorrect" | "confusing" | "duplicate";
        explanation: string;
        relatedFlashcardId?: string;
      }>;
      flashcards: Array<{
        id: string;
        front: string;
        subjectName: string;
        subjectPath?: string;
        subjectId: string | null;
      }>;
    }
  | ActionErrorResult
> {
  return runValidatedUserAction(
    "flashcards.validateFlashcards",
    validateFlashcardsSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => {
      const flashcards = await getFlashcardsByIdsForValidation(
        userId,
        parsedData.flashcardIds,
      );

      if (flashcards.length === 0) {
        return actionError("flashcards.validation.noCards");
      }

      const result = await validateFlashcardsForUser({
        userId,
        flashcards,
      });

      if (!result.success) {
        return actionError(result.errorCode);
      }

      const flashcardsMap = new Map(flashcards.map((card) => [card.id, card]));

      const richTextToPlainText = (await import("@/lib/editor/rich-text"))
        .richTextToPlainText;

      return {
        success: true,
        issues: result.validation.issues.map((issue) => {
          let explanation = issue.explanation;
          if (issue.relatedFlashcardId) {
            const relatedCard = flashcardsMap.get(issue.relatedFlashcardId);
            if (relatedCard) {
              const frontText = richTextToPlainText(relatedCard.front);
              const frontPreview = frontText.substring(0, 50);
              explanation = `${explanation} Similar to: "${frontPreview}${frontText.length > 50 ? "..." : ""}"`;
            }
          }
          return {
            id: issue.flashcardId,
            issueType: issue.issueType,
            explanation,
            relatedFlashcardId: issue.relatedFlashcardId,
          };
        }),
        flashcards: flashcards.map((card) => ({
          id: card.id,
          front: card.front,
          subjectName: card.subjectName,
          subjectId: card.subjectId,
        })),
      };
    },
  );
}
