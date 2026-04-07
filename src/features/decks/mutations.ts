import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard } from "@/db/schema";
import {
  countDecksBySubjectForUser,
  getDeckRecordForUser,
  getDefaultDeckForSubject,
} from "@/features/decks/queries";
import type {
  CreateDeckForm,
  DeleteDeckForm,
  EditDeckForm,
} from "@/features/decks/validation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import type {
  CreateDeckResult,
  DeleteDeckResult,
  EditDeckResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

export async function createDeckForUser(
  userId: string,
  data: CreateDeckForm,
): Promise<CreateDeckResult> {
  const [existingSubject, currentCount] = await Promise.all([
    getActiveSubjectRecordForUser(userId, data.subjectId),
    countDecksBySubjectForUser(userId, data.subjectId),
  ]);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (currentCount >= LIMITS.maxDecksPerSubject) {
    return actionError("limits.deckLimit", {
      errorParams: { max: LIMITS.maxDecksPerSubject },
    });
  }

  try {
    const inserted = await getDb()
      .insert(deck)
      .values({
        subjectId: data.subjectId,
        userId,
        name: data.name,
        description: data.description,
        isDefault: false,
      })
      .returning();

    return { success: true, deck: inserted[0] };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("decks.duplicateName");
    }
    throw error;
  }
}

export async function editDeckForUser(
  userId: string,
  data: EditDeckForm,
): Promise<EditDeckResult> {
  const existingDeck = await getDeckRecordForUser(userId, data.id);

  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  try {
    const updated = await getDb()
      .update(deck)
      .set({
        name: data.name,
        description: data.description,
      })
      .where(and(eq(deck.id, data.id), eq(deck.userId, userId)))
      .returning();

    return { success: true, deck: updated[0] };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("decks.duplicateName");
    }
    throw error;
  }
}

export async function deleteDeckForUser(
  userId: string,
  data: DeleteDeckForm,
): Promise<DeleteDeckResult> {
  const existingDeck = await getDeckRecordForUser(userId, data.id);

  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  if (existingDeck.isDefault) {
    return actionError("decks.cannotDeleteDefault");
  }

  const defaultDeck = await getDefaultDeckForSubject(
    userId,
    existingDeck.subjectId,
  );

  if (!defaultDeck) {
    return actionError("decks.defaultNotFound");
  }

  await getDb().transaction(async (tx) => {
    await tx
      .update(flashcard)
      .set({ deckId: defaultDeck.id })
      .where(eq(flashcard.deckId, data.id));

    await tx
      .delete(deck)
      .where(and(eq(deck.id, data.id), eq(deck.userId, userId)));
  });

  return { success: true, id: data.id, subjectId: existingDeck.subjectId };
}

export async function ensureDefaultDeckForSubject(
  userId: string,
  subjectId: string,
): Promise<{ id: string }> {
  const existing = await getDefaultDeckForSubject(userId, subjectId);

  if (existing) {
    return { id: existing.id };
  }

  const inserted = await getDb()
    .insert(deck)
    .values({
      subjectId,
      userId,
      name: "General",
      isDefault: true,
    })
    .returning();

  return { id: inserted[0].id };
}

function isUniqueViolationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
