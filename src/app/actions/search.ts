"use server";

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard, note, subject } from "@/db/schema";
import type { SearchData } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { searchQuerySchema } from "@/lib/validations/search";

const searchSubjectsLimit = 50;
const searchNotesLimit = 50;
const searchFlashcardsLimit = 50;

function escapeIlike(value: string): string {
  return value.replaceAll(/[\\%_]/g, String.raw`\$&`);
}

export async function getSearchData(query?: string): Promise<SearchData> {
  const userId = await getAuthenticatedUserId();
  const parsed = searchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return { subjects: [], notes: [], flashcards: [] };
  }

  const searchQuery = parsed.data;
  const searchPattern = `%${escapeIlike(searchQuery)}%`;
  const shouldFilter = searchQuery.length > 0;

  const [allSubjects, allNotes, allFlashcards] = await Promise.all([
    db
      .select({
        id: subject.id,
        name: subject.name,
        description: subject.description,
      })
      .from(subject)
      .where(
        shouldFilter
          ? and(
              eq(subject.userId, userId),
              isNull(subject.archivedAt),
              or(
                ilike(subject.name, searchPattern),
                ilike(subject.description, searchPattern),
              ),
            )
          : and(eq(subject.userId, userId), isNull(subject.archivedAt)),
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
        shouldFilter
          ? and(
              eq(note.userId, userId),
              eq(subject.userId, userId),
              isNull(subject.archivedAt),
              or(
                ilike(note.title, searchPattern),
                ilike(note.content, searchPattern),
                ilike(subject.name, searchPattern),
              ),
            )
          : and(
              eq(note.userId, userId),
              eq(subject.userId, userId),
              isNull(subject.archivedAt),
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
        shouldFilter
          ? and(
              eq(flashcard.userId, userId),
              eq(subject.userId, userId),
              isNull(subject.archivedAt),
              or(
                ilike(flashcard.front, searchPattern),
                ilike(flashcard.back, searchPattern),
              ),
            )
          : and(
              eq(flashcard.userId, userId),
              eq(subject.userId, userId),
              isNull(subject.archivedAt),
            ),
      )
      .orderBy(desc(flashcard.updatedAt))
      .limit(searchFlashcardsLimit),
  ]);

  return { subjects: allSubjects, notes: allNotes, flashcards: allFlashcards };
}
