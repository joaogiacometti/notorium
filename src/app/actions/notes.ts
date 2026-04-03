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
    async (userId, parsedData) => {
      const result = await createNoteForUser(userId, parsedData);

      if (result.success) {
        revalidateNoteSubjectPaths(result.subjectId);
      }

      return result;
    },
  );
}

export async function editNote(data: EditNoteForm): Promise<MutationResult> {
  return runValidatedUserAction(
    editNoteSchema,
    data,
    "notes.invalidData",
    async (userId, parsedData) => {
      const result = await editNoteForUser(userId, parsedData);

      if (result.success) {
        revalidateNoteDetailPaths(result.subjectId, parsedData.id);
      }

      return result;
    },
  );
}

export async function deleteNote(
  data: DeleteNoteForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    deleteNoteSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => {
      const result = await deleteNoteForUser(userId, parsedData);

      if (result.success) {
        revalidateNoteSubjectPaths(result.subjectId);
      }

      return result;
    },
  );
}
