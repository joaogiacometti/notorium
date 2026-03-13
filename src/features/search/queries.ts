import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard, note, subject } from "@/db/schema";
import type { SearchData } from "@/lib/server/api-contracts";

const searchSubjectsLimit = 20;
const searchNotesLimit = 20;
const searchFlashcardsLimit = 20;
const recentSubjectsLimit = 5;
const recentNotesLimit = 5;
const recentFlashcardsLimit = 5;

function escapeIlike(value: string): string {
  return value.replaceAll(/[\\%_]/g, String.raw`\$&`);
}

export async function getSearchDataForUser(
  userId: string,
  searchQuery: string,
): Promise<SearchData> {
  const searchPattern = `%${escapeIlike(searchQuery)}%`;

  const [allSubjects, allNotes, allFlashcards] = await Promise.all([
    db
      .select({
        id: subject.id,
        name: subject.name,
        description: subject.description,
      })
      .from(subject)
      .where(
        and(
          eq(subject.userId, userId),
          isNull(subject.archivedAt),
          or(
            ilike(subject.name, searchPattern),
            ilike(subject.description, searchPattern),
          ),
        ),
      )
      .orderBy(desc(subject.updatedAt))
      .limit(searchSubjectsLimit),
    db
      .select({
        id: note.id,
        title: note.title,
        content: sql<string>`left(coalesce(${note.content}, ''), 100)`,
        subjectId: note.subjectId,
        subjectName: subject.name,
      })
      .from(note)
      .innerJoin(subject, eq(note.subjectId, subject.id))
      .where(
        and(
          eq(note.userId, userId),
          eq(subject.userId, userId),
          isNull(subject.archivedAt),
          or(
            ilike(note.title, searchPattern),
            ilike(note.content, searchPattern),
            ilike(subject.name, searchPattern),
          ),
        ),
      )
      .orderBy(desc(note.updatedAt))
      .limit(searchNotesLimit),
    db
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: sql<string>`left(${flashcard.back}, 100)`,
        subjectId: flashcard.subjectId,
        subjectName: subject.name,
      })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(
        and(
          eq(flashcard.userId, userId),
          eq(subject.userId, userId),
          isNull(subject.archivedAt),
          or(
            ilike(flashcard.front, searchPattern),
            ilike(flashcard.back, searchPattern),
          ),
        ),
      )
      .orderBy(desc(flashcard.updatedAt))
      .limit(searchFlashcardsLimit),
  ]);

  return { subjects: allSubjects, notes: allNotes, flashcards: allFlashcards };
}

export async function getRecentSearchDataForUser(
  userId: string,
): Promise<SearchData> {
  const [allSubjects, allNotes, allFlashcards] = await Promise.all([
    db
      .select({
        id: subject.id,
        name: subject.name,
        description: subject.description,
      })
      .from(subject)
      .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)))
      .orderBy(desc(subject.updatedAt))
      .limit(recentSubjectsLimit),
    db
      .select({
        id: note.id,
        title: note.title,
        content: sql<string>`left(coalesce(${note.content}, ''), 100)`,
        subjectId: note.subjectId,
        subjectName: subject.name,
      })
      .from(note)
      .innerJoin(subject, eq(note.subjectId, subject.id))
      .where(
        and(
          eq(note.userId, userId),
          eq(subject.userId, userId),
          isNull(subject.archivedAt),
        ),
      )
      .orderBy(desc(note.updatedAt))
      .limit(recentNotesLimit),
    db
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: sql<string>`left(${flashcard.back}, 100)`,
        subjectId: flashcard.subjectId,
        subjectName: subject.name,
      })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(
        and(
          eq(flashcard.userId, userId),
          eq(subject.userId, userId),
          isNull(subject.archivedAt),
        ),
      )
      .orderBy(desc(flashcard.updatedAt))
      .limit(recentFlashcardsLimit),
  ]);

  return { subjects: allSubjects, notes: allNotes, flashcards: allFlashcards };
}
