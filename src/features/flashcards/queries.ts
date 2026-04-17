import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard } from "@/db/schema";
import {
  getAllDecksWithPathsForUser,
  getDescendantDeckIds,
} from "@/features/decks/queries";
import {
  getFlashcardManageBackExcerpt,
  getFlashcardManageBackExcerptSourceLength,
} from "@/features/flashcards/manage-excerpts";
import type { FlashcardsManageQueryInput } from "@/features/flashcards/validation";
import {
  getRichTextExcerpt,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type {
  FlashcardDetailEntity,
  FlashcardEntity,
  FlashcardListEntity,
  FlashcardManagePage,
} from "@/lib/server/api-contracts";

async function getDeckPathMapForUser(
  userId: string,
): Promise<Map<string, string>> {
  const decks = await getAllDecksWithPathsForUser(userId);
  return new Map(
    decks.map((currentDeck) => [currentDeck.id, currentDeck.path]),
  );
}

async function resolveScopedDeckIds(
  userId: string,
  deckId?: string,
  deckIds?: string[],
): Promise<string[] | undefined> {
  if (deckIds && deckIds.length > 0) {
    return deckIds;
  }

  if (!deckId) {
    return undefined;
  }

  return getDescendantDeckIds(userId, deckId);
}

export async function getFlashcardsForUser(
  userId: string,
): Promise<FlashcardListEntity[]> {
  const [rows, deckPathMap] = await Promise.all([
    getDb()
      .select({ flashcard, deckName: deck.name })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(eq(flashcard.userId, userId))
      .orderBy(desc(flashcard.updatedAt)),
    getDeckPathMapForUser(userId),
  ]);

  return rows.map((row) => ({
    ...row.flashcard,
    deckName: row.deckName,
    deckPath: deckPathMap.get(row.flashcard.deckId) ?? row.deckName,
  }));
}

export async function getFlashcardsManagePageForUser(
  userId: string,
  { pageIndex, pageSize, deckId, deckIds, search }: FlashcardsManageQueryInput,
): Promise<FlashcardManagePage> {
  const normalizedSearch = search?.trim() ?? "";
  const searchPattern = buildContainsSearchPattern(normalizedSearch);
  const offset = pageIndex * pageSize;
  const backExcerptSourceLength = getFlashcardManageBackExcerptSourceLength();
  const filters: SQL<unknown>[] = [eq(flashcard.userId, userId)];
  const scopedDeckIds = await resolveScopedDeckIds(userId, deckId, deckIds);

  if (scopedDeckIds && scopedDeckIds.length > 0) {
    filters.push(inArray(flashcard.deckId, scopedDeckIds));
  }

  const totalFilters =
    normalizedSearch.length > 0
      ? [
          ...filters,
          or(
            ilike(flashcard.front, searchPattern),
            ilike(flashcard.back, searchPattern),
            ilike(deck.name, searchPattern),
          ),
        ]
      : filters;

  const [itemRows, totalRows, deckCountRows, deckPathMap] = await Promise.all([
    getDb()
      .select({
        id: flashcard.id,
        deckId: flashcard.deckId,
        updatedAt: flashcard.updatedAt,
        front: flashcard.front,
        back: sql<string>`left(${flashcard.back}, ${backExcerptSourceLength})`,
        deckName: deck.name,
      })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(...totalFilters))
      .orderBy(desc(flashcard.updatedAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(...totalFilters)),
    deckId
      ? getDb()
          .select({ total: count() })
          .from(flashcard)
          .where(
            and(eq(flashcard.userId, userId), eq(flashcard.deckId, deckId)),
          )
      : Promise.resolve([]),
    getDeckPathMapForUser(userId),
  ]);

  return {
    items: itemRows.map((row) => ({
      id: row.id,
      deckId: row.deckId,
      updatedAt: row.updatedAt,
      front: row.front,
      frontExcerpt: getRichTextExcerpt(row.front, 30),
      frontTitle: richTextToPlainText(row.front) || null,
      backExcerpt: getFlashcardManageBackExcerpt(row.back),
      deckName: row.deckName,
      deckPath: deckPathMap.get(row.deckId) ?? row.deckName,
    })),
    total: totalRows[0]?.total ?? 0,
    deckCardCount: deckId ? (deckCountRows[0]?.total ?? 0) : null,
  };
}

export async function getFlashcardByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardEntity | null> {
  const results = await getDb()
    .select({ flashcard })
    .from(flashcard)
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  return results[0]?.flashcard ?? null;
}

export async function getFlashcardDetailByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardDetailEntity | null> {
  const [results, deckPathMap] = await Promise.all([
    getDb()
      .select({ flashcard, deckName: deck.name })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
      .limit(1),
    getDeckPathMapForUser(userId),
  ]);

  const result = results[0];
  if (!result) {
    return null;
  }

  return {
    ...result.flashcard,
    deckName: result.deckName,
    deckPath: deckPathMap.get(result.flashcard.deckId) ?? result.deckName,
  };
}

export async function getFlashcardRecordForUser(
  userId: string,
  flashcardId: string,
): Promise<Pick<FlashcardEntity, "id" | "deckId"> | null> {
  const results = await getDb()
    .select({ id: flashcard.id, deckId: flashcard.deckId })
    .from(flashcard)
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getFlashcardRecordsForUser(
  userId: string,
  flashcardIds: string[],
): Promise<Array<Pick<FlashcardEntity, "id" | "deckId">>> {
  if (flashcardIds.length === 0) {
    return [];
  }

  return getDb()
    .select({ id: flashcard.id, deckId: flashcard.deckId })
    .from(flashcard)
    .where(
      and(inArray(flashcard.id, flashcardIds), eq(flashcard.userId, userId)),
    );
}

export async function countFlashcardsByDeckForUser(
  userId: string,
  deckId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(flashcard)
    .where(and(eq(flashcard.deckId, deckId), eq(flashcard.userId, userId)));

  return result[0]?.total ?? 0;
}

export async function hasDuplicateFlashcardFrontForUser(
  userId: string,
  frontNormalized: string,
  excludedFlashcardId?: string,
): Promise<boolean> {
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(flashcard.frontNormalized, frontNormalized),
  ];

  if (excludedFlashcardId) {
    filters.push(ne(flashcard.id, excludedFlashcardId));
  }

  const result = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(and(...filters))
    .limit(1);

  return result.length > 0;
}

export async function getFlashcardsByIdsForValidation(
  userId: string,
  flashcardIds: string[],
): Promise<
  Array<{
    id: string;
    front: string;
    back: string;
    deckName: string;
    deckPath?: string;
    deckId: string;
  }>
> {
  if (flashcardIds.length === 0) {
    return [];
  }

  const [results, deckPathMap] = await Promise.all([
    getDb()
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        deckName: deck.name,
        deckId: flashcard.deckId,
      })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(
        and(inArray(flashcard.id, flashcardIds), eq(flashcard.userId, userId)),
      ),
    getDeckPathMapForUser(userId),
  ]);

  return results.map((result) => ({
    ...result,
    deckPath: deckPathMap.get(result.deckId) ?? result.deckName,
  }));
}

export async function getAllFlashcardIdsForUser(
  userId: string,
): Promise<string[]> {
  const results = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(eq(flashcard.userId, userId))
    .orderBy(desc(flashcard.updatedAt));

  return results.map((row) => row.id);
}

export async function getAllFlashcardIdsForDeck(
  userId: string,
  deckId: string,
): Promise<string[]> {
  const scopedDeckIds = await resolveScopedDeckIds(userId, deckId);

  if (!scopedDeckIds || scopedDeckIds.length === 0) {
    return [];
  }

  const results = await getDb()
    .select({ id: flashcard.id })
    .from(flashcard)
    .where(
      and(
        eq(flashcard.userId, userId),
        inArray(flashcard.deckId, scopedDeckIds),
      ),
    )
    .orderBy(desc(flashcard.updatedAt));

  return results.map((row) => row.id);
}
