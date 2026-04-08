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
  type CreateNoteForm,
  createNoteSchema,
  type DeleteNoteForm,
  deleteNoteSchema,
  type EditNoteForm,
  editNoteSchema,
} from "@/features/notes/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
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
  return runValidatedUserAction(
    createNoteSchema,
    data,
    "notes.invalidData",
    async (userId, parsedData) => createNoteForUser(userId, parsedData),
  );
}

export async function editNote(data: EditNoteForm): Promise<MutationResult> {
  return runValidatedUserAction(
    editNoteSchema,
    data,
    "notes.invalidData",
    async (userId, parsedData) => editNoteForUser(userId, parsedData),
  );
}

export async function deleteNote(
  data: DeleteNoteForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    deleteNoteSchema,
    data,
    "notes.invalidData",
    async (userId, parsedData) => deleteNoteForUser(userId, parsedData),
  );
}
