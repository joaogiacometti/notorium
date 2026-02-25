"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { note, subject } from "@/db/schema";
import type { SearchData } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";

export async function getSearchData(): Promise<SearchData> {
  const userId = await getAuthenticatedUserId();

  const allSubjects = await db
    .select({
      id: subject.id,
      name: subject.name,
      description: subject.description,
    })
    .from(subject)
    .where(eq(subject.userId, userId))
    .orderBy(desc(subject.updatedAt));

  const allNotes = await db
    .select({
      id: note.id,
      title: note.title,
      content: note.content,
      subjectId: note.subjectId,
      subjectName: subject.name,
    })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(eq(note.userId, userId))
    .orderBy(desc(note.updatedAt));

  return { subjects: allSubjects, notes: allNotes };
}
