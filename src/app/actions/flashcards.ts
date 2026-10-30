"use server";

import {
  bulkDeleteFlashcardsForUser,
  bulkMoveFlashcardsForUser,
  bulkResetFlashcardsForUser,
  createFlashcardForUser,
  deleteFlashcardForUser,
  editFlashcardForUser,
  resetFlashcardForUser,
} from "@/features/flashcards/mutations";
import { setFlashcardStudyLaterForUser } from "@/features/flashcards/study-later-mutations";
import {
  type BulkDeleteFlashcardsForm,
  type BulkMoveFlashcardsForm,
  type BulkResetFlashcardsForm,
  bulkDeleteFlashcardsSchema,
  bulkMoveFlashcardsSchema,
  bulkResetFlashcardsSchema,
  type CreateFlashcardForm as CreateFlashcardInput,
  createFlashcardSchema as createFlashcardInputSchema,
  type DeleteFlashcardForm,
  deleteFlashcardSchema,
  type EditFlashcardForm,
  editFlashcardSchema,
  type ResetFlashcardForm,
  resetFlashcardSchema,
  type SetFlashcardStudyLaterForm,
  setFlashcardStudyLaterSchema,
} from "@/features/flashcards/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  BulkDeleteFlashcardsResult,
  BulkMoveFlashcardsResult,
  BulkResetFlashcardsResult,
  CreateFlashcardResult,
  DeleteFlashcardResult,
  EditFlashcardResult,
  ResetFlashcardResult,
  SetFlashcardStudyLaterResult,
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

// Skips `revalidateAppShell`: no server-rendered view shows the mark, and a
// refresh mid-review would redirect away once nothing else is due (see
// `use-app-shell-refresh-after-review.ts`). The manage table refetches instead.
export async function setFlashcardStudyLater(
  data: SetFlashcardStudyLaterForm,
): Promise<SetFlashcardStudyLaterResult> {
  return runValidatedUserAction(
    "flashcards.setFlashcardStudyLater",
    setFlashcardStudyLaterSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) =>
      setFlashcardStudyLaterForUser(userId, parsedData),
  );
}
