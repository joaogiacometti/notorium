import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck } from "@/db/schema";
import {
  countChildDecksForUser,
  countDecksForUser,
  getDeckDepthForUser,
  getDeckRecordForUser,
  isDeckAncestorOf,
} from "@/features/decks/queries";
import type {
  CreateDeckForm,
  DeleteDeckForm,
  EditDeckForm,
  MoveDeckForm,
} from "@/features/decks/validation";
import { LIMITS } from "@/lib/config/limits";
import type {
  CreateDeckResult,
  DeleteDeckResult,
  EditDeckResult,
  MoveDeckResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

export async function createDeckForUser(
  userId: string,
  data: CreateDeckForm,
): Promise<CreateDeckResult> {
  const [totalCount, childCount] = await Promise.all([
    countDecksForUser(userId),
    data.parentDeckId
      ? countChildDecksForUser(userId, data.parentDeckId)
      : Promise.resolve(0),
  ]);

  if (totalCount >= LIMITS.maxDecksPerUser) {
    return actionError("limits.deckLimit", {
      errorParams: { max: LIMITS.maxDecksPerUser },
    });
  }

  if (data.parentDeckId) {
    const [parentDeck, parentDepth] = await Promise.all([
      getDeckRecordForUser(userId, data.parentDeckId),
      getDeckDepthForUser(userId, data.parentDeckId),
    ]);

    if (!parentDeck) {
      return actionError("decks.notFound");
    }

    if (childCount >= LIMITS.maxChildDecksPerDeck) {
      return actionError("limits.childDeckLimit", {
        errorParams: { max: LIMITS.maxChildDecksPerDeck },
      });
    }

    if (parentDepth !== null && parentDepth >= LIMITS.maxDeckNestingDepth) {
      return actionError("limits.deckNestingDepthLimit", {
        errorParams: { max: LIMITS.maxDeckNestingDepth },
      });
    }
  }

  try {
    const inserted = await getDb()
      .insert(deck)
      .values({
        parentDeckId: data.parentDeckId ?? null,
        userId,
        name: data.name,
        description: data.description,
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

  await getDb()
    .delete(deck)
    .where(and(eq(deck.id, data.id), eq(deck.userId, userId)));

  return {
    success: true,
    id: data.id,
    parentDeckId: existingDeck.parentDeckId,
  };
}

export async function moveDeckForUser(
  userId: string,
  data: MoveDeckForm,
): Promise<MoveDeckResult> {
  const existingDeck = await getDeckRecordForUser(userId, data.id);

  if (!existingDeck) {
    return actionError("decks.notFound");
  }

  const newParentDeckId = data.parentDeckId ?? null;

  if (newParentDeckId === existingDeck.parentDeckId) {
    return {
      success: true,
      id: data.id,
      previousParentDeckId: existingDeck.parentDeckId,
      newParentDeckId,
    };
  }

  if (newParentDeckId !== null) {
    const newParent = await getDeckRecordForUser(userId, newParentDeckId);
    if (!newParent) {
      return actionError("decks.notFound");
    }

    if (newParentDeckId === data.id) {
      return actionError("decks.cannotMoveIntoSelf");
    }

    const wouldCreateCycle = await isDeckAncestorOf(
      userId,
      data.id,
      newParentDeckId,
    );
    if (wouldCreateCycle) {
      return actionError("decks.wouldCreateCycle");
    }

    const [childCount, parentDepth] = await Promise.all([
      countChildDecksForUser(userId, newParentDeckId),
      getDeckDepthForUser(userId, newParentDeckId),
    ]);

    if (childCount >= LIMITS.maxChildDecksPerDeck) {
      return actionError("limits.childDeckLimit", {
        errorParams: { max: LIMITS.maxChildDecksPerDeck },
      });
    }

    if (parentDepth !== null && parentDepth >= LIMITS.maxDeckNestingDepth) {
      return actionError("limits.deckNestingDepthLimit", {
        errorParams: { max: LIMITS.maxDeckNestingDepth },
      });
    }
  }

  try {
    await getDb()
      .update(deck)
      .set({ parentDeckId: newParentDeckId })
      .where(and(eq(deck.id, data.id), eq(deck.userId, userId)));
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return actionError("decks.duplicateName");
    }

    throw error;
  }

  return {
    success: true,
    id: data.id,
    previousParentDeckId: existingDeck.parentDeckId,
    newParentDeckId,
  };
}

function isUniqueViolationError(error: unknown): boolean {
  return (
    hasUniqueViolationCode(error) ||
    (typeof error === "object" &&
      error !== null &&
      "cause" in error &&
      hasUniqueViolationCode((error as { cause?: unknown }).cause))
  );
}

function hasUniqueViolationCode(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (
    "code" in error &&
    (
      error as {
        code?: string;
      }
    ).code === "23505"
  );
}
