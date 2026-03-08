import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/index";
import { note, subject } from "@/db/schema";
import type { NoteEntity } from "@/lib/api/contracts";

export async function getNotesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<NoteEntity[]> {
  return db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.subjectId, subjectId),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(desc(note.updatedAt))
    .then((rows) => rows.map((row) => row.note));
}

export async function getNoteByIdForUser(
  userId: string,
  noteId: string,
): Promise<NoteEntity | null> {
  const results = await db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, noteId),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0]?.note ?? null;
}

export async function getNoteRecordForUser(
  userId: string,
  noteId: string,
): Promise<Pick<NoteEntity, "id" | "subjectId"> | null> {
  const results = await db
    .select({ id: note.id, subjectId: note.subjectId })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, noteId),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function countNotesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await db
    .select({ total: count() })
    .from(note)
    .where(and(eq(note.subjectId, subjectId), eq(note.userId, userId)));

  return result[0]?.total ?? 0;
}
