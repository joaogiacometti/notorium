import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard, note, subject } from "@/db/schema";
import { getAllDecksWithPathsForUser } from "@/features/decks/queries";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import { LIMITS } from "@/lib/config/limits";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type { SearchData } from "@/lib/server/api-contracts";

export async function getSearchDataForUser(
  userId: string,
  searchQuery: string,
): Promise<SearchData> {
  const searchPattern = buildContainsSearchPattern(searchQuery);
  const subjectFilters = getOwnedActiveSubjectFilters(userId);
  const deckPathMap = await getAllDecksWithPathsForUser(userId).then(
    (decks) =>
      new Map(decks.map((currentDeck) => [currentDeck.id, currentDeck.path])),
  );

  const [allSubjects, allNotes, allFlashcards] = await Promise.all([
    getDb()
      .select({
        id: subject.id,
        name: subject.name,
        description: subject.description,
      })
      .from(subject)
      .where(
        and(
          eq(subject.userId, userId),
          ...subjectFilters,
          or(
            ilike(subject.name, searchPattern),
            ilike(subject.description, searchPattern),
          ),
        ),
      )
      .orderBy(desc(subject.updatedAt))
      .limit(LIMITS.searchResultsLimit),
    getDb()
      .select({
        id: note.id,
        title: note.title,
        content: sql<string>`left(coalesce(${note.content}, ''), ${LIMITS.contentPreviewTruncate})`,
        subjectId: note.subjectId,
        subjectName: subject.name,
      })
      .from(note)
      .innerJoin(subject, eq(note.subjectId, subject.id))
      .where(
        and(
          eq(note.userId, userId),
          ...subjectFilters,
          or(
            ilike(note.title, searchPattern),
            ilike(note.content, searchPattern),
            ilike(subject.name, searchPattern),
          ),
        ),
      )
      .orderBy(desc(note.updatedAt))
      .limit(LIMITS.searchResultsLimit),
    getDb()
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: sql<string>`left(${flashcard.back}, ${LIMITS.contentPreviewTruncate})`,
        deckId: flashcard.deckId,
        deckName: deck.name,
      })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(
        and(
          eq(flashcard.userId, userId),
          or(
            ilike(flashcard.front, searchPattern),
            ilike(flashcard.back, searchPattern),
          ),
        ),
      )
      .orderBy(desc(flashcard.updatedAt))
      .limit(LIMITS.searchResultsLimit),
  ]);

  return {
    subjects: allSubjects,
    notes: allNotes,
    flashcards: allFlashcards.map((flashcard) => ({
      ...flashcard,
      deckPath: deckPathMap.get(flashcard.deckId) ?? flashcard.deckName,
    })),
  };
}

export async function getRecentSearchDataForUser(
  userId: string,
): Promise<SearchData> {
  const subjectFilters = getOwnedActiveSubjectFilters(userId);
  const deckPathMap = await getAllDecksWithPathsForUser(userId).then(
    (decks) =>
      new Map(decks.map((currentDeck) => [currentDeck.id, currentDeck.path])),
  );

  const [allSubjects, allNotes, allFlashcards] = await Promise.all([
    getDb()
      .select({
        id: subject.id,
        name: subject.name,
        description: subject.description,
      })
      .from(subject)
      .where(and(eq(subject.userId, userId), ...subjectFilters))
      .orderBy(desc(subject.updatedAt))
      .limit(LIMITS.recentItemsLimit),
    getDb()
      .select({
        id: note.id,
        title: note.title,
        content: sql<string>`left(coalesce(${note.content}, ''), ${LIMITS.contentPreviewTruncate})`,
        subjectId: note.subjectId,
        subjectName: subject.name,
      })
      .from(note)
      .innerJoin(subject, eq(note.subjectId, subject.id))
      .where(and(eq(note.userId, userId), ...subjectFilters))
      .orderBy(desc(note.updatedAt))
      .limit(LIMITS.recentItemsLimit),
    getDb()
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: sql<string>`left(${flashcard.back}, ${LIMITS.contentPreviewTruncate})`,
        deckId: flashcard.deckId,
        deckName: deck.name,
      })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(eq(flashcard.userId, userId))
      .orderBy(desc(flashcard.updatedAt))
      .limit(LIMITS.recentItemsLimit),
  ]);

  return {
    subjects: allSubjects,
    notes: allNotes,
    flashcards: allFlashcards.map((flashcard) => ({
      ...flashcard,
      deckPath: deckPathMap.get(flashcard.deckId) ?? flashcard.deckName,
    })),
  };
}
