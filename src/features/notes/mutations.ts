import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note } from "@/db/schema";
import { cleanupAttachmentsAfterMutation } from "@/features/attachments";
import {
  countNotesBySubjectForUser,
  getNoteByIdForUser,
} from "@/features/notes/queries";
import type {
  CreateNoteForm,
  DeleteNoteForm,
  EditNoteForm,
} from "@/features/notes/validation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
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
  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    data.subjectId,
  );
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
