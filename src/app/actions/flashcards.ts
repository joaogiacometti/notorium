"use server";

import {
  createFlashcardForUser,
  deleteFlashcardForUser,
  editFlashcardForUser,
  generateFlashcardBackForUserInput,
  importAnkiFlashcardsForUser,
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
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { LIMITS } from "@/lib/config/limits";
import { parseActionInput } from "@/lib/server/action-input";
import type {
  CreateFlashcardResult,
  DeleteFlashcardResult,
  EditFlashcardResult,
  GenerateFlashcardBackResult,
  MutationResult,
  ResetFlashcardResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

export async function createFlashcard(
  data: CreateFlashcardInput,
): Promise<CreateFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    createFlashcardInputSchema,
    data,
    "flashcards.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await createFlashcardForUser(userId, parsed.data);

  if (result.success) {
    revalidateFlashcardSubjectPaths(result.flashcard.subjectId);
  }

  return result;
}

export async function importAnkiFlashcards(
  formData: FormData,
): Promise<MutationResult & { imported?: number }> {
  const userId = await getAuthenticatedUserId();
  const subjectId = formData.get("subjectId");
  const file = formData.get("file");

  if (typeof subjectId !== "string" || !(file instanceof File)) {
    return actionError("flashcards.import.invalidFormat");
  }

  if (file.size === 0 || file.size > LIMITS.maxImportBytes) {
    return actionError("flashcards.import.invalidFormat");
  }

  const result = await importAnkiFlashcardsForUser(userId, { subjectId, file });

  if (result.success) {
    revalidateFlashcardReviewPaths(subjectId);
  }

  return result;
}

export async function editFlashcard(
  data: EditFlashcardForm,
): Promise<EditFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    editFlashcardSchema,
    data,
    "flashcards.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await editFlashcardForUser(userId, parsed.data);

  if (result.success) {
    revalidateFlashcardReviewPaths(result.flashcard.subjectId, parsed.data.id);
  }

  return result;
}

export async function generateFlashcardBack(
  data: GenerateFlashcardBackForm,
): Promise<GenerateFlashcardBackResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    generateFlashcardBackSchema,
    data,
    "flashcards.ai.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  return generateFlashcardBackForUserInput(userId, parsed.data);
}

export async function deleteFlashcard(
  data: DeleteFlashcardForm,
): Promise<DeleteFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    deleteFlashcardSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await deleteFlashcardForUser(userId, parsed.data);

  if (result.success !== true) {
    return result;
  }

  revalidateFlashcardDetailPaths(result.subjectId, parsed.data.id);
  return { success: true, id: parsed.data.id };
}

export async function resetFlashcard(
  data: ResetFlashcardForm,
): Promise<ResetFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    resetFlashcardSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await resetFlashcardForUser(userId, parsed.data);

  if (result.success) {
    revalidateFlashcardReviewPaths(result.flashcard.subjectId, parsed.data.id);
  }

  return result;
}
