import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note, subject } from "@/db/schema";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import type { NoteEntity } from "@/lib/server/api-contracts";

export async function getNotesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<NoteEntity[]> {
  return getDb()
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.subjectId, subjectId),
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(note.updatedAt))
    .then((rows) => rows.map((row) => row.note));
}

export async function getNoteByIdForUser(
  userId: string,
  noteId: string,
): Promise<NoteEntity | null> {
  const results = await getDb()
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, noteId),
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0]?.note ?? null;
}

export async function getNoteRecordForUser(
  userId: string,
  noteId: string,
): Promise<Pick<NoteEntity, "id" | "subjectId"> | null> {
  const results = await getDb()
    .select({ id: note.id, subjectId: note.subjectId })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, noteId),
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function countNotesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.subjectId, subjectId),
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    );

  return result[0]?.total ?? 0;
}
