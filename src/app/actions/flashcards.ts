"use server";

import {
  bulkDeleteFlashcardsForUser,
  bulkMoveFlashcardsForUser,
  bulkResetFlashcardsForUser,
  createFlashcardForUser,
  deleteFlashcardForUser,
  editFlashcardForUser,
  improveFlashcardBackForUserInput,
  resetFlashcardForUser,
} from "@/features/flashcards/mutations";
import { hasDuplicateFlashcardFrontForUser } from "@/features/flashcards/queries";
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
  type ImproveFlashcardBackForm,
  improveFlashcardBackSchema,
  type ResetFlashcardForm,
  resetFlashcardSchema,
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
  ImproveFlashcardBackResult,
  ResetFlashcardResult,
} from "@/lib/server/api-contracts";
import { revalidateAppShell } from "@/lib/server/revalidate-views";

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
    revalidateAppShell();
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
    revalidateAppShell();
  }

  return result;
}

export async function improveFlashcardBack(
  data: ImproveFlashcardBackForm,
): Promise<ImproveFlashcardBackResult> {
  return runValidatedUserAction(
    "flashcards.improveFlashcardBack",
    improveFlashcardBackSchema,
    data,
    "flashcards.ai.invalidData",
    (userId, parsedData) =>
      improveFlashcardBackForUserInput(userId, parsedData),
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
    revalidateAppShell();
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
    revalidateAppShell();
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
    revalidateAppShell();
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
    revalidateAppShell();
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
    revalidateAppShell();
  }

  return result;
}
