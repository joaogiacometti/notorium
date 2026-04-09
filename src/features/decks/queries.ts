import { and, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard, subject } from "@/db/schema";
import type { DeckEntity, DeckWithCount } from "@/lib/server/api-contracts";

export async function getDecksBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<DeckEntity[]> {
  return getDb()
    .select()
    .from(deck)
    .where(and(eq(deck.subjectId, subjectId), eq(deck.userId, userId)))
    .orderBy(deck.isDefault, deck.name);
}

export async function getDecksWithCountBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<DeckWithCount[]> {
  const decks = await getDecksBySubjectForUser(userId, subjectId);

  if (decks.length === 0) {
    return [];
  }
  const counts = await getDb()
    .select({ deckId: flashcard.deckId, count: count() })
    .from(flashcard)
    .where(eq(flashcard.userId, userId))
    .groupBy(flashcard.deckId)
    .then((rows) => new Map(rows.map((r) => [r.deckId, r.count])));

  return decks.map((d) => ({
    ...d,
    flashcardCount: counts.get(d.id) ?? 0,
  }));
}

export async function getDeckByIdForUser(
  userId: string,
  deckId: string,
): Promise<DeckEntity | null> {
  const results = await getDb()
    .select()
    .from(deck)
    .innerJoin(subject, eq(deck.subjectId, subject.id))
    .where(
      and(
        eq(deck.id, deckId),
        eq(deck.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0]?.deck ?? null;
}

export async function getDeckRecordForUser(
  userId: string,
  deckId: string,
): Promise<{
  id: string;
  subjectId: string;
  isDefault: boolean;
  name: string;
} | null> {
  const results = await getDb()
    .select({
      id: deck.id,
      subjectId: deck.subjectId,
      isDefault: deck.isDefault,
      name: deck.name,
    })
    .from(deck)
    .innerJoin(subject, eq(deck.subjectId, subject.id))
    .where(
      and(
        eq(deck.id, deckId),
        eq(deck.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function countDecksBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(deck)
    .where(and(eq(deck.subjectId, subjectId), eq(deck.userId, userId)));

  return result[0]?.total ?? 0;
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

export async function getDefaultDeckForSubject(
  userId: string,
  subjectId: string,
): Promise<DeckEntity | null> {
  const results = await getDb()
    .select()
    .from(deck)
    .where(
      and(
        eq(deck.subjectId, subjectId),
        eq(deck.userId, userId),
        eq(deck.isDefault, true),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function getDeckWithSubjectForUser(
  userId: string,
  deckId: string,
): Promise<(DeckEntity & { subjectName: string }) | null> {
  const results = await getDb()
    .select({ deck, subjectName: subject.name })
    .from(deck)
    .innerJoin(subject, eq(deck.subjectId, subject.id))
    .where(
      and(
        eq(deck.id, deckId),
        eq(deck.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (!results[0]) {
    return null;
  }

  return {
    ...results[0].deck,
    subjectName: results[0].subjectName,
  };
}
