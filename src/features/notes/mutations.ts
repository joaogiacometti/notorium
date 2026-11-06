import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note } from "@/db/schema";
import {
  checkDocumentFolderCapacity,
  type DocumentCapacityRule,
  moveDocumentForUser,
} from "@/features/documents/move-target";
import type {
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import {
  countNotesByFolderForUser,
  getNoteByIdForUser,
} from "@/features/notes/queries";
import type {
  CreateNoteForm,
  DeleteNoteForm,
  EditNoteForm,
} from "@/features/notes/validation";
import { LIMITS } from "@/lib/config/limits";
import { documentText, emptyDocument } from "@/lib/editor/document";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

const noteCapacityRule: DocumentCapacityRule = {
  countInFolder: countNotesByFolderForUser,
  max: LIMITS.maxNotesPerFolder,
  limitErrorCode: "limits.noteLimit",
};

export type CreateNoteMutationResult =
  | {
      success: true;
      folderId: string;
      noteId: string;
    }
  | ActionErrorResult;

export type NoteMutationResult =
  | {
      success: true;
      folderId: string;
    }
  | ActionErrorResult;

function getNoteMutationValues(
  values: Pick<CreateNoteForm, "title" | "content">,
) {
  return {
    title: values.title,
    content: values.content ?? emptyDocument(),
    contentText: values.content ? documentText(values.content) : "",
  };
}

export async function createNoteForUser(
  userId: string,
  data: CreateNoteForm,
): Promise<CreateNoteMutationResult> {
  const capacityError = await checkDocumentFolderCapacity(
    userId,
    data.folderId,
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
      folderId: data.folderId,
      userId,
    });

  return { success: true, folderId: data.folderId, noteId };
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

  return { success: true, folderId: existing.folderId };
}

// Omitted content means a title-only rename, so the saved content is kept.
function getNoteEditValues(data: EditNoteForm) {
  if (data.content === undefined) {
    return { title: data.title };
  }

  return getNoteMutationValues(data);
}

/**
 * Reparents a note to another folder (drag-and-drop in the tree), enforcing
 * ownership and the target's note limit.
 */
export function moveNoteForUser(
  userId: string,
  data: MoveDocumentMutationInput,
): Promise<MoveDocumentResult> {
  return moveDocumentForUser(userId, data, {
    findFolderId: async (ownerId, id) =>
      (await getNoteByIdForUser(ownerId, id))?.folderId ?? null,
    notFoundCode: "notes.notFound",
    rule: noteCapacityRule,
    reparent: async (ownerId, id, folderId) => {
      await getDb()
        .update(note)
        .set({ folderId })
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

  return { success: true, folderId: existing.folderId };
}
