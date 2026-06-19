import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note } from "@/db/schema";
import { cleanupAttachmentsAfterMutation } from "@/features/attachments";
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
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

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
  const existingSubject = await getSubjectRecordForUser(userId, data.subjectId);
  const current = await countNotesBySubjectForUser(userId, data.subjectId);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (current >= LIMITS.maxNotesPerSubject) {
    return actionError("limits.noteLimit", {
      errorParams: { max: LIMITS.maxNotesPerSubject },
    });
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
    .set(getNoteMutationValues(data))
    .where(and(eq(note.id, data.id), eq(note.userId, userId)));

  await cleanupAttachmentsAfterMutation(
    userId,
    [existing.content ?? ""],
    [data.content ?? ""],
  );

  return { success: true, subjectId: existing.subjectId };
}

/**
 * Reparents a note to another subject (drag-and-drop in the tree). Enforces
 * ownership of both note and target subject, and the target's note limit. A
 * move to the current subject is a no-op success.
 */
export async function moveNoteForUser(
  userId: string,
  data: MoveDocumentMutationInput,
): Promise<MoveDocumentResult> {
  const existing = await getNoteByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("notes.notFound");
  }

  if (existing.subjectId === data.subjectId) {
    return noteMoveResult(existing.subjectId, existing.subjectId);
  }

  const targetError = await validateNoteMoveTarget(userId, data.subjectId);
  if (targetError) {
    return targetError;
  }

  await getDb()
    .update(note)
    .set({ subjectId: data.subjectId })
    .where(and(eq(note.id, data.id), eq(note.userId, userId)));

  return noteMoveResult(data.subjectId, existing.subjectId);
}

function noteMoveResult(
  subjectId: string,
  previousSubjectId: string,
): MoveDocumentResult {
  return { success: true, subjectId, previousSubjectId };
}

async function validateNoteMoveTarget(
  userId: string,
  subjectId: string,
): Promise<ActionErrorResult | null> {
  const targetSubject = await getSubjectRecordForUser(userId, subjectId);
  if (!targetSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countNotesBySubjectForUser(userId, subjectId);
  if (current >= LIMITS.maxNotesPerSubject) {
    return actionError("limits.noteLimit", {
      errorParams: { max: LIMITS.maxNotesPerSubject },
    });
  }

  return null;
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

  await cleanupAttachmentsAfterMutation(userId, [existing.content ?? ""], []);

  return { success: true, subjectId: existing.subjectId };
}
