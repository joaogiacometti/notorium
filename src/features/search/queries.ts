import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, note, pdfDocument, subject } from "@/db/schema";
import { foldedContains } from "@/features/search/match-sql";
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

  const [allNotes, allPdfs, allFlashcards] = await Promise.all([
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
            foldedContains(note.title, searchPattern),
            foldedContains(note.content, searchPattern),
            foldedContains(subject.name, searchPattern),
          ),
        ),
      )
      .orderBy(desc(note.updatedAt))
      .limit(LIMITS.searchResultsLimit),
    getDb()
      .select({
        id: pdfDocument.id,
        title: pdfDocument.title,
        subjectId: pdfDocument.subjectId,
        subjectName: subject.name,
      })
      .from(pdfDocument)
      .innerJoin(subject, eq(pdfDocument.subjectId, subject.id))
      .where(
        and(
          eq(pdfDocument.userId, userId),
          ...subjectFilters,
          or(
            foldedContains(pdfDocument.title, searchPattern),
            foldedContains(subject.name, searchPattern),
          ),
        ),
      )
      .orderBy(desc(pdfDocument.updatedAt))
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
            foldedContains(flashcard.front, searchPattern),
            foldedContains(flashcard.back, searchPattern),
          ),
        ),
      )
      .orderBy(desc(flashcard.updatedAt))
      .limit(LIMITS.searchResultsLimit),
  ]);

  return {
    notes: allNotes,
    pdfs: allPdfs,
    flashcards: allFlashcards.map((flashcard) => ({
      ...flashcard,
      subjectPath:
        (flashcard.subjectId
          ? subjectPathMap.get(flashcard.subjectId)
          : undefined) ?? flashcard.subjectName,
    })),
  };
}
