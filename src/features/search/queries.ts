import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, libraryBook, mindmap, note, subject } from "@/db/schema";
import { findMindmapNodeLabelMatch } from "@/features/mindmaps/utils";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
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
  const subjectPathMap = await getAllSubjectsWithPathsForUser(userId).then(
    (subjects) =>
      new Map(
        subjects.map((currentSubject) => [
          currentSubject.id,
          currentSubject.path,
        ]),
      ),
  );

  const [allSubjects, allNotes, allFlashcards, allMindmaps, allBooks] =
    await Promise.all([
      getDb()
        .select({
          id: subject.id,
          name: subject.name,
        })
        .from(subject)
        .where(
          and(
            eq(subject.userId, userId),
            ...subjectFilters,
            // General subjects have no page, so they are never search targets;
            // their notes and mindmaps remain searchable below.
            eq(subject.kind, "academic"),
            ilike(subject.name, searchPattern),
          ),
        )
        .orderBy(desc(subject.updatedAt))
        .limit(LIMITS.searchResultsLimit),
      getDb()
        .select({
          id: note.id,
          title: note.title,
          content: sql<string>`coalesce(${note.content}, '')`,
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
          back: flashcard.back,
          subjectId: flashcard.subjectId,
          subjectName: subject.name,
        })
        .from(flashcard)
        .innerJoin(subject, eq(flashcard.subjectId, subject.id))
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
      getDb()
        .select({
          id: mindmap.id,
          title: mindmap.title,
          subjectId: mindmap.subjectId,
          subjectName: subject.name,
          data: mindmap.data,
        })
        .from(mindmap)
        .innerJoin(subject, eq(mindmap.subjectId, subject.id))
        .where(
          and(
            eq(mindmap.userId, userId),
            ...subjectFilters,
            or(
              ilike(mindmap.title, searchPattern),
              ilike(mindmap.data, searchPattern),
              ilike(subject.name, searchPattern),
            ),
          ),
        )
        .orderBy(desc(mindmap.updatedAt))
        .limit(LIMITS.searchResultsLimit),
      getDb()
        .select({
          id: libraryBook.id,
          title: libraryBook.title,
          author: libraryBook.author,
        })
        .from(libraryBook)
        .where(
          and(
            eq(libraryBook.userId, userId),
            or(
              ilike(libraryBook.title, searchPattern),
              ilike(libraryBook.author, searchPattern),
            ),
          ),
        )
        .orderBy(desc(libraryBook.updatedAt))
        .limit(LIMITS.searchResultsLimit),
    ]);

  return {
    subjects: allSubjects,
    notes: allNotes,
    flashcards: allFlashcards.map((flashcard) => ({
      ...flashcard,
      subjectPath:
        (flashcard.subjectId
          ? subjectPathMap.get(flashcard.subjectId)
          : undefined) ?? flashcard.subjectName,
    })),
    mindmaps: allMindmaps.map(({ data, title, ...rest }) => ({
      ...rest,
      title,
      matchedNodeLabel: title.toLowerCase().includes(searchQuery.toLowerCase())
        ? undefined
        : findMindmapNodeLabelMatch(data, searchQuery),
    })),
    books: allBooks,
  };
}

export async function getRecentSearchDataForUser(
  userId: string,
): Promise<SearchData> {
  const subjectFilters = getOwnedActiveSubjectFilters(userId);
  const subjectPathMap = await getAllSubjectsWithPathsForUser(userId).then(
    (subjects) =>
      new Map(
        subjects.map((currentSubject) => [
          currentSubject.id,
          currentSubject.path,
        ]),
      ),
  );

  const [allSubjects, allNotes, allFlashcards, allMindmaps, allBooks] =
    await Promise.all([
      getDb()
        .select({
          id: subject.id,
          name: subject.name,
        })
        .from(subject)
        .where(
          and(
            eq(subject.userId, userId),
            ...subjectFilters,
            // General subjects have no page, so they are never search targets.
            eq(subject.kind, "academic"),
          ),
        )
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
          subjectId: flashcard.subjectId,
          subjectName: subject.name,
        })
        .from(flashcard)
        .innerJoin(subject, eq(flashcard.subjectId, subject.id))
        .where(eq(flashcard.userId, userId))
        .orderBy(desc(flashcard.updatedAt))
        .limit(LIMITS.recentItemsLimit),
      getDb()
        .select({
          id: mindmap.id,
          title: mindmap.title,
          subjectId: mindmap.subjectId,
          subjectName: subject.name,
        })
        .from(mindmap)
        .innerJoin(subject, eq(mindmap.subjectId, subject.id))
        .where(and(eq(mindmap.userId, userId), ...subjectFilters))
        .orderBy(desc(mindmap.updatedAt))
        .limit(LIMITS.recentItemsLimit),
      getDb()
        .select({
          id: libraryBook.id,
          title: libraryBook.title,
          author: libraryBook.author,
        })
        .from(libraryBook)
        .where(eq(libraryBook.userId, userId))
        .orderBy(desc(libraryBook.updatedAt))
        .limit(LIMITS.recentItemsLimit),
    ]);

  return {
    subjects: allSubjects,
    notes: allNotes,
    flashcards: allFlashcards.map((flashcard) => ({
      ...flashcard,
      subjectPath:
        (flashcard.subjectId
          ? subjectPathMap.get(flashcard.subjectId)
          : undefined) ?? flashcard.subjectName,
    })),
    mindmaps: allMindmaps,
    books: allBooks,
  };
}
