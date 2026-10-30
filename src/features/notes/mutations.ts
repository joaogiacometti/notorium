import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note } from "@/db/schema";
import {
  checkDocumentSubjectCapacity,
  type DocumentCapacityRule,
  moveDocumentForUser,
} from "@/features/documents/move-target";
import type {
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import {
  countNotesBySubjectForUser,
  getNoteByIdForUser,
} from "@/features/notes/queries";
import type {
  CreateNoteForm,
  DeleteNoteForm,
  EditNoteForm,
} from "@/features/notes/validation";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

const noteCapacityRule: DocumentCapacityRule = {
  countInSubject: countNotesBySubjectForUser,
  max: LIMITS.maxNotesPerSubject,
  limitErrorCode: "limits.noteLimit",
};

export type CreateNoteMutationResult =
  | {
      success: true;
      subjectId: string;
      noteId: string;
    }
  | ActionErrorResult;

export type NoteMutationResult =
  | {
      success: true;
      subjectId: string;
    }
  | ActionErrorResult;

function getNoteMutationValues(
  values: Pick<CreateNoteForm, "title" | "content">,
) {
  return {
    title: values.title,
    content: values.content ?? null,
  };
}

export async function createNoteForUser(
  userId: string,
  data: CreateNoteForm,
): Promise<CreateNoteMutationResult> {
  const capacityError = await checkDocumentSubjectCapacity(
    userId,
    data.subjectId,
    noteCapacityRule,
  );
  if (capacityError) {
    return capacityError;
  }

  const noteId = crypto.randomUUID();

  await getDb()
    .insert(note)
    .values({
      id: noteId,
      ...getNoteMutationValues(data),
      subjectId: data.subjectId,
      userId,
    });

  return { success: true, subjectId: data.subjectId, noteId };
}

export async function editNoteForUser(
  userId: string,
  data: EditNoteForm,
): Promise<NoteMutationResult> {
  const existing = await getNoteByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("notes.notFound");
  }

  await getDb()
    .update(note)
    .set(getNoteEditValues(data))
    .where(and(eq(note.id, data.id), eq(note.userId, userId)));

  return { success: true, subjectId: existing.subjectId };
}

// Omitted content means a title-only rename, so the saved content is kept.
function getNoteEditValues(data: EditNoteForm) {
  if (data.content === undefined) {
    return { title: data.title };
  }

  return getNoteMutationValues(data);
}

/**
 * Reparents a note to another subject (drag-and-drop in the tree), enforcing
 * ownership and the target's note limit.
 */
export function moveNoteForUser(
  userId: string,
  data: MoveDocumentMutationInput,
): Promise<MoveDocumentResult> {
  return moveDocumentForUser(userId, data, {
    findSubjectId: async (ownerId, id) =>
      (await getNoteByIdForUser(ownerId, id))?.subjectId ?? null,
    notFoundCode: "notes.notFound",
    rule: noteCapacityRule,
    reparent: async (ownerId, id, subjectId) => {
      await getDb()
        .update(note)
        .set({ subjectId })
        .where(and(eq(note.id, id), eq(note.userId, ownerId)));
    },
  });
}

export async function deleteNoteForUser(
  userId: string,
  data: DeleteNoteForm,
): Promise<NoteMutationResult> {
  const existing = await getNoteByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("notes.notFound");
  }

  await getDb()
    .delete(note)
    .where(and(eq(note.id, data.id), eq(note.userId, userId)));

  return { success: true, subjectId: existing.subjectId };
}
