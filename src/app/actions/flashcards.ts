"use server";

import {
  createFlashcardForUser,
  deleteFlashcardForUser,
  editFlashcardForUser,
  generateFlashcardBackForUserInput,
  resetFlashcardForUser,
} from "@/features/flashcards/mutations";
import {
  revalidateFlashcardDetailPaths,
  revalidateFlashcardReviewPaths,
  revalidateFlashcardSubjectPaths,
} from "@/features/flashcards/revalidation";
import {
  type CreateFlashcardForm as CreateFlashcardInput,
  createFlashcardSchema as createFlashcardInputSchema,
  type DeleteFlashcardForm,
  deleteFlashcardSchema,
  type EditFlashcardForm,
  editFlashcardSchema,
  type GenerateFlashcardBackForm,
  generateFlashcardBackSchema,
  type ResetFlashcardForm,
  resetFlashcardSchema,
} from "@/features/flashcards/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  CreateFlashcardResult,
  DeleteFlashcardResult,
  EditFlashcardResult,
  GenerateFlashcardBackResult,
  ResetFlashcardResult,
} from "@/lib/server/api-contracts";

export async function createFlashcard(
  data: CreateFlashcardInput,
): Promise<CreateFlashcardResult> {
  return runValidatedUserAction(
    createFlashcardInputSchema,
    data,
    "flashcards.invalidData",
    async (userId, parsedData) => {
      const result = await createFlashcardForUser(userId, parsedData);

      if (result.success) {
        revalidateFlashcardSubjectPaths(result.flashcard.subjectId);
      }

      return result;
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
    async (userId, parsedData) => {
      const result = await editFlashcardForUser(userId, parsedData);

      if (result.success) {
        revalidateFlashcardReviewPaths(
          result.flashcard.subjectId,
          parsedData.id,
        );
      }

      return result;
    },
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
    "common.invalidRequest",
    async (userId, parsedData) => {
      const result = await deleteFlashcardForUser(userId, parsedData);

      if (result.success !== true) {
        return result;
      }

      revalidateFlashcardDetailPaths(result.subjectId, parsedData.id);
      return { success: true, id: parsedData.id };
    },
  );
}

export async function resetFlashcard(
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  return runValidatedUserAction(
    resetFlashcardSchema,
    data,
    "common.invalidRequest",
    async (userId, parsedData) => {
      const result = await resetFlashcardForUser(userId, parsedData);

      if (result.success) {
        revalidateFlashcardReviewPaths(
          result.flashcard.subjectId,
          parsedData.id,
        );
      }

      return result;
    },
  );
}
