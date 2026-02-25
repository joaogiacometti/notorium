"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { note } from "@/db/schema";
import type { MutationResult, NoteEntity } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
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
    .select()
    .from(note)
    .where(and(eq(note.subjectId, subjectId), eq(note.userId, userId)))
    .orderBy(desc(note.updatedAt));
}

export async function getNoteById(id: string): Promise<NoteEntity | null> {
  const userId = await getAuthenticatedUserId();

  const results = await db
    .select()
    .from(note)
    .where(and(eq(note.id, id), eq(note.userId, userId)));

  return results[0] ?? null;
}

export async function createNote(
  data: CreateNoteForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = createNoteSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid note data." };
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
    return { error: "Invalid note data." };
  }

  const existing = await db
    .select()
    .from(note)
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  if (existing.length === 0) {
    return { error: "Note not found." };
  }

  await db
    .update(note)
    .set({
      title: parsed.data.title,
      content: parsed.data.content ?? null,
    })
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  const existingNote = existing[0];
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
    return { error: "Invalid request." };
  }

  const existing = await db
    .select()
    .from(note)
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  if (existing.length === 0) {
    return { error: "Note not found." };
  }

  const existingNote = existing[0];

  await db
    .delete(note)
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  revalidatePath(`/subjects/${existingNote.subjectId}`);
  return { success: true };
}
