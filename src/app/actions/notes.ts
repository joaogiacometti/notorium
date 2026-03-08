"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { note } from "@/db/schema";
import {
  countNotesBySubjectForUser,
  getNoteByIdForUser,
  getNoteRecordForUser,
  getNotesBySubjectForUser,
} from "@/features/notes/queries";
import {
  revalidateNoteDetailPaths,
  revalidateNoteSubjectPaths,
} from "@/features/notes/revalidation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import { parseActionInput } from "@/lib/action-input";
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
  return getNotesBySubjectForUser(userId, subjectId);
}

export async function getNoteById(id: string): Promise<NoteEntity | null> {
  const userId = await getAuthenticatedUserId();
  return getNoteByIdForUser(userId, id);
}

export async function createNote(
  data: CreateNoteForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(createNoteSchema, data, "notes.invalidData");

  if (!parsed.success) {
    return parsed.error;
  }

  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    parsed.data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countNotesBySubjectForUser(
    userId,
    parsed.data.subjectId,
  );

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

  revalidateNoteSubjectPaths(parsed.data.subjectId);
  return { success: true };
}

export async function editNote(data: EditNoteForm): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(editNoteSchema, data, "notes.invalidData");

  if (!parsed.success) {
    return parsed.error;
  }

  const existing = await getNoteRecordForUser(userId, parsed.data.id);

  if (!existing) {
    return actionError("notes.notFound");
  }

  await db
    .update(note)
    .set({
      title: parsed.data.title,
      content: parsed.data.content ?? null,
    })
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  revalidateNoteDetailPaths(existing.subjectId, parsed.data.id);
  return { success: true };
}

export async function deleteNote(
  data: DeleteNoteForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    deleteNoteSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existing = await getNoteRecordForUser(userId, parsed.data.id);

  if (!existing) {
    return actionError("notes.notFound");
  }

  await db
    .delete(note)
    .where(and(eq(note.id, parsed.data.id), eq(note.userId, userId)));

  revalidateNoteSubjectPaths(existing.subjectId);
  return { success: true };
}
