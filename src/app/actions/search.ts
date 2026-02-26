"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { note, subject } from "@/db/schema";
import type { SearchData } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { searchQuerySchema } from "@/lib/validations/search";

export async function getSearchData(query?: string): Promise<SearchData> {
  const userId = await getAuthenticatedUserId();
  const parsed = searchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return { subjects: [], notes: [] };
  }

  const searchQuery = parsed.data;
  const searchPattern = `%${searchQuery}%`;
  const shouldFilter = searchQuery.length > 0;

  const allSubjects = await db
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
    .orderBy(desc(subject.updatedAt));

  const allNotes = await db
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
            or(
              ilike(note.title, searchPattern),
              ilike(note.content, searchPattern),
              ilike(subject.name, searchPattern),
            ),
          )
        : eq(note.userId, userId),
    )
    .orderBy(desc(note.updatedAt));

  return { subjects: allSubjects, notes: allNotes };
}
