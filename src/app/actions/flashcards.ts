"use server";

import { z } from "zod";
import {
  generateFlashcardsForUser as generateFlashcardsForUserService,
  validateFlashcardsForUser,
} from "@/features/flashcards/ai-service";
import {
  bulkDeleteFlashcardsForUser,
  bulkMoveFlashcardsForUser,
  createFlashcardForUser,
  deleteFlashcardForUser,
  editFlashcardForUser,
  generateFlashcardBackForUserInput,
  resetFlashcardForUser,
} from "@/features/flashcards/mutations";
import {
  countFlashcardsBySubjectForUser,
  getAllFlashcardIdsForSubject,
  getAllFlashcardIdsForUser,
  getFlashcardByIdForUser,
  getFlashcardsByIdsForValidation,
  getFlashcardsManagePageForUser,
  hasDuplicateFlashcardFrontForUser,
} from "@/features/flashcards/queries";
import {
  type BulkDeleteFlashcardsForm,
  type BulkMoveFlashcardsForm,
  bulkDeleteFlashcardsSchema,
  bulkMoveFlashcardsSchema,
  type CheckFlashcardDuplicateForm,
  type CreateFlashcardForm as CreateFlashcardInput,
  checkFlashcardDuplicateSchema,
  createFlashcardSchema as createFlashcardInputSchema,
  type DeleteFlashcardForm,
  deleteFlashcardSchema,
  type EditFlashcardForm,
  editFlashcardSchema,
  type FlashcardsManageQueryInput,
  flashcardsManageQuerySchema,
  type GenerateFlashcardBackForm,
  type GenerateFlashcardsForm,
  type GetFlashcardIdsForSubjectForm,
  generateFlashcardBackSchema,
  generateFlashcardsSchema,
  getFlashcardIdsForSubjectSchema,
  type ResetFlashcardForm,
  resetFlashcardSchema,
  type ValidateFlashcardsForm,
  validateFlashcardsSchema,
} from "@/features/flashcards/validation";
import { getActiveSubjectByIdForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { normalizeRichTextForUniqueness } from "@/lib/editor/rich-text";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  BulkDeleteFlashcardsResult,
  BulkMoveFlashcardsResult,
  CheckFlashcardDuplicateResult,
  CreateFlashcardResult,
  DeleteFlashcardResult,
  EditFlashcardResult,
  FlashcardEntity,
  FlashcardManagePage,
  GenerateFlashcardBackResult,
  ResetFlashcardResult,
} from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export async function createFlashcard(
  data: CreateFlashcardInput,
): Promise<CreateFlashcardResult> {
  return runValidatedUserAction(
    createFlashcardInputSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => createFlashcardForUser(userId, parsedData),
  );
}

export async function checkFlashcardDuplicate(
  data: CheckFlashcardDuplicateForm,
): Promise<CheckFlashcardDuplicateResult> {
  return runValidatedUserAction(
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
  return runValidatedUserAction(
    editFlashcardSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => editFlashcardForUser(userId, parsedData),
  );
}

export async function generateFlashcardBack(
  data: GenerateFlashcardBackForm,
): Promise<GenerateFlashcardBackResult> {
  return runValidatedUserAction(
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
  return runValidatedUserAction(
    deleteFlashcardSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => {
      const result = await deleteFlashcardForUser(userId, parsedData);

      if (result.success !== true) {
        return result;
      }

      return { success: true, id: parsedData.id };
    },
  );
}

export async function bulkDeleteFlashcards(
  data: BulkDeleteFlashcardsForm,
): Promise<BulkDeleteFlashcardsResult> {
  return runValidatedUserAction(
    bulkDeleteFlashcardsSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) =>
      bulkDeleteFlashcardsForUser(userId, parsedData),
  );
}

export async function bulkMoveFlashcards(
  data: BulkMoveFlashcardsForm,
): Promise<BulkMoveFlashcardsResult> {
  return runValidatedUserAction(
    bulkMoveFlashcardsSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => bulkMoveFlashcardsForUser(userId, parsedData),
  );
}

export async function resetFlashcard(
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  return runValidatedUserAction(
    resetFlashcardSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => resetFlashcardForUser(userId, parsedData),
  );
}

export async function getFlashcardsManagePage(
  data: FlashcardsManageQueryInput,
): Promise<FlashcardManagePage | ActionErrorResult> {
  return runValidatedUserAction(
    flashcardsManageQuerySchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) =>
      getFlashcardsManagePageForUser(userId, parsedData),
  );
}

export async function getFlashcardForManage(
  data: DeleteFlashcardForm,
): Promise<{ flashcard: FlashcardEntity } | ActionErrorResult> {
  return runValidatedUserAction(
    deleteFlashcardSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => {
      const flashcard = await getFlashcardByIdForUser(userId, parsedData.id);

      if (!flashcard) {
        return actionError("flashcards.notFound");
      }

      return { flashcard };
    },
  );
}

export async function getFlashcardIdsForSubject(
  data: GetFlashcardIdsForSubjectForm,
): Promise<{ success: true; flashcardIds: string[] } | ActionErrorResult> {
  return runValidatedUserAction(
    getFlashcardIdsForSubjectSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => {
      const flashcardIds = await getAllFlashcardIdsForSubject(
        userId,
        parsedData.subjectId,
      );

      return { success: true, flashcardIds };
    },
  );
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
        subjectId: string;
      }>;
    }
  | ActionErrorResult
> {
  return runValidatedUserAction(
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

export async function getAllFlashcardIds(): Promise<
  { success: true; flashcardIds: string[] } | ActionErrorResult
> {
  return runValidatedUserAction(
    z.object({}),
    {},
    "ServerErrors.common.invalidRequest",
    async (userId) => {
      const flashcardIds = await getAllFlashcardIdsForUser(userId);
      return { success: true, flashcardIds };
    },
  );
}

export async function generateFlashcards(
  data: GenerateFlashcardsForm,
): Promise<
  | { success: true; cards: Array<{ front: string; back: string }> }
  | ActionErrorResult
> {
  return runValidatedUserAction(
    generateFlashcardsSchema,
    data,
    "flashcards.ai.invalidData",
    async (userId, parsedData) => {
      const subject = await getActiveSubjectByIdForUser(
        userId,
        parsedData.subjectId,
      );

      if (!subject) {
        return actionError("subjects.notFound");
      }

      const currentCount = await countFlashcardsBySubjectForUser(
        userId,
        parsedData.subjectId,
      );

      if (currentCount >= LIMITS.maxFlashcardsPerSubject) {
        return actionError("limits.flashcardLimit", {
          errorParams: { max: LIMITS.maxFlashcardsPerSubject },
        });
      }

      const result = await generateFlashcardsForUserService({
        userId,
        subjectName: subject.name,
        text: parsedData.text,
      });

      return result;
    },
  );
}
