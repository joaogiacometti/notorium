"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { note, subject } from "@/db/schema";
import type { SearchData } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { searchQuerySchema } from "@/lib/validations/search";

const searchSubjectsLimit = 50;
const searchNotesLimit = 50;

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function getSearchData(query?: string): Promise<SearchData> {
  const userId = await getAuthenticatedUserId();
  const parsed = searchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return { subjects: [], notes: [] };
  }

  const searchQuery = parsed.data;
  const searchPattern = `%${escapeIlike(searchQuery)}%`;
  const shouldFilter = searchQuery.length > 0;

  const [allSubjects, allNotes] = await Promise.all([
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
              or(
                ilike(subject.name, searchPattern),
                ilike(subject.description, searchPattern),
              ),
            )
          : eq(subject.userId, userId),
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
              or(
                ilike(note.title, searchPattern),
                ilike(note.content, searchPattern),
                ilike(subject.name, searchPattern),
              ),
            )
          : and(eq(note.userId, userId), eq(subject.userId, userId)),
      )
      .orderBy(desc(note.updatedAt))
      .limit(searchNotesLimit),
  ]);

  return { subjects: allSubjects, notes: allNotes };
}
