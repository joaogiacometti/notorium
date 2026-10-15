"use server";

import { revalidatePath } from "next/cache";
import {
  type CreateNoteMutationResult,
  createNoteForUser,
  deleteNoteForUser,
  editNoteForUser,
} from "@/features/notes/mutations";
import {
  type CreateNoteForm,
  createNoteSchema,
  type DeleteNoteForm,
  deleteNoteSchema,
  type EditNoteForm,
  editNoteSchema,
} from "@/features/notes/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";

export async function createNote(
  data: CreateNoteForm,
): Promise<CreateNoteMutationResult> {
  const result = await runValidatedUserAction(
    "notes.createNote",
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
    "notes.editNote",
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
    "notes.deleteNote",
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
