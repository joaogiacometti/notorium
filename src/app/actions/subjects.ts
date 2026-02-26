"use server";

import { del } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { note, noteImageAttachment, subject } from "@/db/schema";
import { appEnv } from "@/env";
import type { MutationResult, SubjectEntity } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  type CreateSubjectForm,
  createSubjectSchema,
  type DeleteSubjectForm,
  deleteSubjectSchema,
  type EditSubjectForm,
  editSubjectSchema,
} from "@/lib/validations/subjects";

export async function getSubjects(): Promise<SubjectEntity[]> {
  const userId = await getAuthenticatedUserId();

  return db
    .select()
    .from(subject)
    .where(eq(subject.userId, userId))
    .orderBy(desc(subject.updatedAt));
}

export async function getSubjectById(
  id: string,
): Promise<SubjectEntity | null> {
  const userId = await getAuthenticatedUserId();

  const results = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, id), eq(subject.userId, userId)));

  return results[0] ?? null;
}

export async function createSubject(
  data: CreateSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = createSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid subject data." };
  }

  await db.insert(subject).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    notesEnabled: parsed.data.notesEnabled,
    gradesEnabled: parsed.data.gradesEnabled,
    attendanceEnabled: parsed.data.attendanceEnabled,
    userId,
  });

  revalidatePath("/subjects");
  return { success: true };
}

export async function editSubject(
  data: EditSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = editSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid subject data." };
  }

  const existing = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  if (existing.length === 0) {
    return { error: "Subject not found." };
  }

  await db
    .update(subject)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      notesEnabled: parsed.data.notesEnabled,
      gradesEnabled: parsed.data.gradesEnabled,
      attendanceEnabled: parsed.data.attendanceEnabled,
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidatePath("/subjects");
  revalidatePath(`/subjects/${parsed.data.id}`);
  return { success: true };
}

export async function deleteSubject(
  data: DeleteSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const existing = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  if (existing.length === 0) {
    return { error: "Subject not found." };
  }

  const attachments = await db
    .select({
      blobPathname: noteImageAttachment.blobPathname,
    })
    .from(noteImageAttachment)
    .innerJoin(note, eq(noteImageAttachment.noteId, note.id))
    .where(
      and(
        eq(note.subjectId, parsed.data.id),
        eq(note.userId, userId),
        eq(noteImageAttachment.userId, userId),
      ),
    );

  await db
    .delete(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  if (appEnv.BLOB_READ_WRITE_TOKEN && attachments.length > 0) {
    try {
      await del(
        attachments.map((attachment) => attachment.blobPathname),
        { token: appEnv.BLOB_READ_WRITE_TOKEN },
      );
    } catch {}
  }

  revalidatePath("/subjects");
  return { success: true };
}
