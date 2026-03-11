"use server";

import {
  createNoteForUser,
  deleteNoteForUser,
  editNoteForUser,
} from "@/features/notes/mutations";
import {
  getNoteByIdForUser,
  getNotesBySubjectForUser,
} from "@/features/notes/queries";
import {
  revalidateNoteDetailPaths,
  revalidateNoteSubjectPaths,
} from "@/features/notes/revalidation";
import {
  type CreateNoteForm,
  createNoteSchema,
  type DeleteNoteForm,
  deleteNoteSchema,
  type EditNoteForm,
  editNoteSchema,
} from "@/features/notes/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { parseActionInput } from "@/lib/server/action-input";
import type { MutationResult, NoteEntity } from "@/lib/server/api-contracts";

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

  const result = await createNoteForUser(userId, parsed.data);

  if (result.success) {
    revalidateNoteSubjectPaths(result.subjectId);
  }

  return result;
}

export async function editNote(data: EditNoteForm): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(editNoteSchema, data, "notes.invalidData");

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await editNoteForUser(userId, parsed.data);

  if (result.success) {
    revalidateNoteDetailPaths(result.subjectId, parsed.data.id);
  }

  return result;
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

  const result = await deleteNoteForUser(userId, parsed.data);

  if (result.success) {
    revalidateNoteSubjectPaths(result.subjectId);
  }

  return result;
}
