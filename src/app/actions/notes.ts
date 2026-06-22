"use server";

import { revalidatePath } from "next/cache";
import {
  type CreateNoteMutationResult,
  createNoteForUser,
  deleteNoteForUser,
  editNoteForUser,
} from "@/features/notes/mutations";
import { getNoteByIdForUser } from "@/features/notes/queries";
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

export async function getNoteById(id: string): Promise<NoteEntity | null> {
  const userId = await getAuthenticatedUserId();
  return getNoteByIdForUser(userId, id);
}

export async function createNote(
  data: CreateNoteForm,
): Promise<CreateNoteMutationResult> {
  const result = await runValidatedUserAction(
    createNoteSchema,
    data,
    "notes.invalidData",
    async (userId, parsedData) => createNoteForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
  }

  return result;
}

export async function editNote(data: EditNoteForm): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    editNoteSchema,
    data,
    "notes.invalidData",
    async (userId, parsedData) => editNoteForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
    revalidatePath(`/subjects/${result.subjectId}/documents/notes/${data.id}`);
  }

  return result;
}

export async function deleteNote(
  data: DeleteNoteForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    deleteNoteSchema,
    data,
    "notes.invalidData",
    async (userId, parsedData) => deleteNoteForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
  }

  return result;
}
