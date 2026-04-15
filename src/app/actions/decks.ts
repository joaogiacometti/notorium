"use server";

import { revalidatePath } from "next/cache";
import {
  createDeckForUser,
  deleteDeckForUser,
  editDeckForUser,
  moveDeckForUser,
} from "@/features/decks/mutations";
import {
  getAllDecksWithPathsForUser,
  getDecksWithCountForUser,
  getDeckTreeForUser,
} from "@/features/decks/queries";
import {
  type CreateDeckForm,
  createDeckSchema,
  type DeleteDeckForm,
  deleteDeckSchema,
  type EditDeckForm,
  editDeckSchema,
  type MoveDeckForm,
  moveDeckSchema,
} from "@/features/decks/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  CreateDeckResult,
  DeckOption,
  DeckTreeNode,
  DeckWithCount,
  DeleteDeckResult,
  EditDeckResult,
  MoveDeckResult,
} from "@/lib/server/api-contracts";

export async function getDecks(): Promise<DeckOption[]> {
  const userId = await getAuthenticatedUserId();
  return getAllDecksWithPathsForUser(userId);
}

export async function getDecksWithCount(): Promise<DeckWithCount[]> {
  const userId = await getAuthenticatedUserId();
  return getDecksWithCountForUser(userId);
}

export async function getDeckTree(): Promise<DeckTreeNode[]> {
  const userId = await getAuthenticatedUserId();
  return getDeckTreeForUser(userId);
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
    revalidatePath("/flashcards");
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
    revalidatePath("/flashcards");
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
    revalidatePath("/flashcards");
  }

  return result;
}

export async function moveDeck(data: MoveDeckForm): Promise<MoveDeckResult> {
  const result = await runValidatedUserAction(
    moveDeckSchema,
    data,
    "decks.invalidData",
    async (userId, parsedData) => moveDeckForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/flashcards");
  }

  return result;
}
