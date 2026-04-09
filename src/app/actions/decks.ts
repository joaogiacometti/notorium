"use server";

import { revalidatePath } from "next/cache";
import {
  createDeckForUser,
  deleteDeckForUser,
  editDeckForUser,
} from "@/features/decks/mutations";
import { getDecksWithCountBySubjectForUser } from "@/features/decks/queries";
import {
  type CreateDeckForm,
  createDeckSchema,
  type DeleteDeckForm,
  deleteDeckSchema,
  type EditDeckForm,
  editDeckSchema,
} from "@/features/decks/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  CreateDeckResult,
  DeckWithCount,
  DeleteDeckResult,
  EditDeckResult,
} from "@/lib/server/api-contracts";

export async function getDecks(subjectId: string): Promise<DeckWithCount[]> {
  const userId = await getAuthenticatedUserId();
  return getDecksWithCountBySubjectForUser(userId, subjectId);
}

export async function createDeck(
  data: CreateDeckForm,
): Promise<CreateDeckResult> {
  const result = await runValidatedUserAction(
    createDeckSchema,
    data,
    "decks.invalidData",
    async (userId, parsedData) => createDeckForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${data.subjectId}`);
  }

  return result;
}

export async function editDeck(data: EditDeckForm): Promise<EditDeckResult> {
  const result = await runValidatedUserAction(
    editDeckSchema,
    data,
    "decks.invalidData",
    async (userId, parsedData) => editDeckForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.deck.subjectId}`);
  }

  return result;
}

export async function deleteDeck(
  data: DeleteDeckForm,
): Promise<DeleteDeckResult> {
  const result = await runValidatedUserAction(
    deleteDeckSchema,
    data,
    "decks.invalidData",
    async (userId, parsedData) => deleteDeckForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
  }

  return result;
}
