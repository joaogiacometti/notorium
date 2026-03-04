"use server";

import { del } from "@vercel/blob";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { note, noteImageAttachment, subject } from "@/db/schema";
import { appEnv } from "@/env";
import type { MutationResult, SubjectEntity } from "@/lib/api/contracts";
import { getAuthenticatedUser, getAuthenticatedUserId } from "@/lib/auth";
import { checkSubjectLimit } from "@/lib/plan-enforcement";
import { actionError } from "@/lib/server-action-errors";
import {
  type ArchiveSubjectForm,
  archiveSubjectSchema,
  type CreateSubjectForm,
  createSubjectSchema,
  type DeleteSubjectForm,
  deleteSubjectSchema,
  type EditSubjectForm,
  editSubjectSchema,
  type RestoreSubjectForm,
  restoreSubjectSchema,
} from "@/lib/validations/subjects";

export async function getSubjects(): Promise<SubjectEntity[]> {
  const userId = await getAuthenticatedUserId();

  return db
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.archivedAt)))
    .orderBy(desc(subject.updatedAt));
}

export async function getArchivedSubjects(): Promise<SubjectEntity[]> {
  const userId = await getAuthenticatedUserId();

  return db
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), isNotNull(subject.archivedAt)))
    .orderBy(desc(subject.updatedAt));
}

export async function getSubjectById(
  id: string,
): Promise<SubjectEntity | null> {
  const userId = await getAuthenticatedUserId();

  const results = await db
    .select()
    .from(subject)
    .where(
      and(
        eq(subject.id, id),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  return results[0] ?? null;
}

export async function createSubject(
  data: CreateSubjectForm,
): Promise<MutationResult> {
  const { userId, plan } = await getAuthenticatedUser();
  const parsed = createSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("subjects.invalidData");
  }

  const limitCheck = await checkSubjectLimit(userId, plan);

  if (!limitCheck.allowed) {
    if (limitCheck.max === null) {
      return actionError("common.generic");
    }

    return actionError("plan.subjectLimit", {
      errorParams: { max: limitCheck.max },
    });
  }

  await db.insert(subject).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
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
    return actionError("subjects.invalidData");
  }

  const existing = await db
    .select()
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.id),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existing.length === 0) {
    return actionError("subjects.notFound");
  }

  await db
    .update(subject)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidatePath("/subjects");
  revalidatePath(`/subjects/${parsed.data.id}`);
  return { success: true };
}

export async function archiveSubject(
  data: ArchiveSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = archiveSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("common.invalidRequest");
  }

  const existing = await db
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.id),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    return actionError("subjects.notFound");
  }

  await db
    .update(subject)
    .set({
      archivedAt: new Date(),
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidatePath("/subjects");
  revalidatePath("/subjects/archived");
  revalidatePath(`/subjects/${parsed.data.id}`);
  revalidatePath("/assessments");
  return { success: true };
}

export async function restoreSubject(
  data: RestoreSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = restoreSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("common.invalidRequest");
  }

  const existing = await db
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.id),
        eq(subject.userId, userId),
        isNotNull(subject.archivedAt),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    return actionError("subjects.notFound");
  }

  await db
    .update(subject)
    .set({
      archivedAt: null,
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidatePath("/subjects");
  revalidatePath("/subjects/archived");
  revalidatePath(`/subjects/${parsed.data.id}`);
  revalidatePath("/assessments");
  return { success: true };
}

export async function deleteSubject(
  data: DeleteSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteSubjectSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("common.invalidRequest");
  }

  const existing = await db
    .select()
    .from(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  if (existing.length === 0) {
    return actionError("subjects.notFound");
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
  revalidatePath("/subjects/archived");
  revalidatePath("/assessments");
  return { success: true };
}
