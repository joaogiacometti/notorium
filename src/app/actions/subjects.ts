"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { subject } from "@/db/schema";
import {
  countSubjectsForUser,
  getActiveSubjectByIdForUser,
  getActiveSubjectRecordForUser,
  getArchivedSubjectRecordForUser,
  getArchivedSubjectsForUser,
  getSubjectRecordForUser,
  getSubjectsForUser,
} from "@/features/subjects/queries";
import {
  revalidateAllSubjectPaths,
  revalidateSubjectDetailPaths,
  revalidateSubjectListPaths,
} from "@/features/subjects/revalidation";
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
} from "@/features/subjects/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { LIMITS } from "@/lib/config/limits";
import { parseActionInput } from "@/lib/server/action-input";
import type { MutationResult, SubjectEntity } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

export async function getSubjects(): Promise<SubjectEntity[]> {
  const userId = await getAuthenticatedUserId();
  return getSubjectsForUser(userId);
}

export async function getArchivedSubjects(): Promise<SubjectEntity[]> {
  const userId = await getAuthenticatedUserId();
  return getArchivedSubjectsForUser(userId);
}

export async function getSubjectById(
  id: string,
): Promise<SubjectEntity | null> {
  const userId = await getAuthenticatedUserId();
  return getActiveSubjectByIdForUser(userId, id);
}

export async function createSubject(
  data: CreateSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    createSubjectSchema,
    data,
    "subjects.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const current = await countSubjectsForUser(userId);

  if (current >= LIMITS.maxSubjects) {
    return actionError("limits.subjectLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }

  await db.insert(subject).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    userId,
  });

  revalidateSubjectListPaths();
  return { success: true };
}

export async function editSubject(
  data: EditSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    editSubjectSchema,
    data,
    "subjects.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existing = await getActiveSubjectRecordForUser(userId, parsed.data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await db
    .update(subject)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidateSubjectDetailPaths(parsed.data.id);
  return { success: true };
}

export async function archiveSubject(
  data: ArchiveSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    archiveSubjectSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existing = await getActiveSubjectRecordForUser(userId, parsed.data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await db
    .update(subject)
    .set({
      archivedAt: new Date(),
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidateAllSubjectPaths(parsed.data.id);
  return { success: true };
}

export async function restoreSubject(
  data: RestoreSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    restoreSubjectSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existing = await getArchivedSubjectRecordForUser(
    userId,
    parsed.data.id,
  );

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await db
    .update(subject)
    .set({
      archivedAt: null,
    })
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidateAllSubjectPaths(parsed.data.id);
  return { success: true };
}

export async function deleteSubject(
  data: DeleteSubjectForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    deleteSubjectSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existing = await getSubjectRecordForUser(userId, parsed.data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await db
    .delete(subject)
    .where(and(eq(subject.id, parsed.data.id), eq(subject.userId, userId)));

  revalidateSubjectListPaths();
  return { success: true };
}
