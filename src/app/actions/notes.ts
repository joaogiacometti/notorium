"use server";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { note, subject } from "@/db/schema";
import type { MutationResult, NoteEntity } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { LIMITS } from "@/lib/limits";
import { actionError } from "@/lib/server-action-errors";
import {
  type CreateNoteForm,
  createNoteSchema,
  type DeleteNoteForm,
  deleteNoteSchema,
  type EditNoteForm,
  editNoteSchema,
} from "@/lib/validations/notes";

export async function getNotesBySubject(
  subjectId: string,
): Promise<NoteEntity[]> {
  const userId = await getAuthenticatedUserId();

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

export async function getNoteById(id: string): Promise<NoteEntity | null> {
  const userId = await getAuthenticatedUserId();

  const results = await db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, id),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  return results[0]?.note ?? null;
}

export async function createNote(
  data: CreateNoteForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = createNoteSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("notes.invalidData");
  }

  const existingSubject = await db
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.subjectId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existingSubject.length === 0) {
    return actionError("subjects.notFound");
  }

  const result = await db
    .select({ total: count() })
    .from(note)
    .where(
      and(eq(note.subjectId, parsed.data.subjectId), eq(note.userId, userId)),
    );

  const current = result[0]?.total ?? 0;

  if (current >= LIMITS.maxNotesPerSubject) {
    return actionError("limits.noteLimit", {
      errorParams: { max: LIMITS.maxNotesPerSubject },
    });
  }

  await db.insert(note).values({
    title: parsed.data.title,
    content: parsed.data.content ?? null,
    subjectId: parsed.data.subjectId,
    userId,
  });

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { success: true };
}

export async function editNote(data: EditNoteForm): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = editNoteSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("notes.invalidData");
  }

  const existing = await db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, parsed.data.id),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existing.length === 0) {
    return actionError("notes.notFound");
  }

  await db
    .update(note)
    .set({
      title: parsed.data.title,
      content: parsed.data.content ?? null,
    })
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  const existingNote = existing[0].note;
  revalidatePath(`/subjects/${existingNote.subjectId}`);
  revalidatePath(`/subjects/${existingNote.subjectId}/notes/${parsed.data.id}`);
  return { success: true };
}

export async function deleteNote(
  data: DeleteNoteForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteNoteSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("common.invalidRequest");
  }

  const existing = await db
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, parsed.data.id),
        eq(note.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existing.length === 0) {
    return actionError("notes.notFound");
  }

  const existingNote = existing[0].note;

  await db
    .delete(note)
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  revalidatePath(`/subjects/${existingNote.subjectId}`);
  return { success: true };
}
