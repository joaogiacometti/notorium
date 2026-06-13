import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/index";
import { subject } from "@/db/schema";
import {
  cleanupAttachmentPathnames,
  getSubjectAttachmentPathnamesForUser,
} from "@/features/attachments/cleanup";
import {
  countTotalSubjectsForUser,
  getActiveSubjectRecordForUser,
  getArchivedSubjectRecordForUser,
  getSubjectRecordForUser,
  getSubjectRecordsForUser,
} from "@/features/subjects/queries";
import type {
  ArchiveSubjectForm,
  BulkArchiveSubjectsForm,
  BulkDeleteSubjectsForm,
  BulkRestoreSubjectsForm,
  CreateSubjectForm,
  DeleteSubjectForm,
  EditSubjectForm,
  RestoreSubjectForm,
} from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";
import type { BulkSubjectMutationResult } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type SubjectMutationResult =
  | {
      success: true;
      subjectId?: string;
    }
  | ActionErrorResult;

function getSubjectMutationValues(
  values: Pick<CreateSubjectForm, "name" | "kind">,
) {
  return {
    name: values.name.trim(),
    kind: values.kind,
  };
}

export async function createSubjectForUser(
  userId: string,
  data: CreateSubjectForm,
): Promise<SubjectMutationResult> {
  const current = await countTotalSubjectsForUser(userId);

  if (current >= LIMITS.maxSubjects) {
    return actionError("limits.subjectLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }

  await getDb()
    .insert(subject)
    .values({ ...getSubjectMutationValues(data), userId });

  return { success: true };
}

export async function editSubjectForUser(
  userId: string,
  data: EditSubjectForm,
): Promise<SubjectMutationResult> {
  const existing = await getActiveSubjectRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .update(subject)
    .set(getSubjectMutationValues(data))
    .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));

  return { success: true, subjectId: data.id };
}

export async function archiveSubjectForUser(
  userId: string,
  data: ArchiveSubjectForm,
): Promise<SubjectMutationResult> {
  const existing = await getActiveSubjectRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .update(subject)
    .set({
      archivedAt: new Date(),
    })
    .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));

  return { success: true, subjectId: data.id };
}

export async function restoreSubjectForUser(
  userId: string,
  data: RestoreSubjectForm,
): Promise<SubjectMutationResult> {
  const existing = await getArchivedSubjectRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .update(subject)
    .set({
      archivedAt: null,
    })
    .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));

  return { success: true, subjectId: data.id };
}

export async function deleteSubjectForUser(
  userId: string,
  data: DeleteSubjectForm,
): Promise<SubjectMutationResult> {
  const existing = await getSubjectRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  const attachmentPathnames = await getSubjectAttachmentPathnamesForUser(
    userId,
    data.id,
  );

  await getDb()
    .delete(subject)
    .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));

  await cleanupAttachmentPathnames(userId, attachmentPathnames);

  return { success: true };
}

function getMissingSubjectIds(
  expectedIds: string[],
  records: Array<{ id: string }>,
): string[] {
  const recordIds = new Set(records.map((record) => record.id));

  return expectedIds.filter((id) => !recordIds.has(id));
}

function hasArchivedSubject(records: Array<{ archivedAt: Date | null }>) {
  return records.some((record) => record.archivedAt !== null);
}

function hasActiveSubject(records: Array<{ archivedAt: Date | null }>) {
  return records.some((record) => record.archivedAt === null);
}

export async function bulkArchiveSubjectsForUser(
  userId: string,
  data: BulkArchiveSubjectsForm,
): Promise<BulkSubjectMutationResult> {
  const existingSubjects = await getSubjectRecordsForUser(userId, data.ids);

  if (
    existingSubjects.length !== data.ids.length ||
    hasArchivedSubject(existingSubjects)
  ) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .update(subject)
    .set({ archivedAt: new Date() })
    .where(
      and(
        inArray(subject.id, data.ids),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  return { success: true, ids: data.ids };
}

export async function bulkRestoreSubjectsForUser(
  userId: string,
  data: BulkRestoreSubjectsForm,
): Promise<BulkSubjectMutationResult> {
  const existingSubjects = await getSubjectRecordsForUser(userId, data.ids);

  if (
    existingSubjects.length !== data.ids.length ||
    hasActiveSubject(existingSubjects)
  ) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .update(subject)
    .set({ archivedAt: null })
    .where(
      and(
        inArray(subject.id, data.ids),
        eq(subject.userId, userId),
        isNotNull(subject.archivedAt),
      ),
    );

  return { success: true, ids: data.ids };
}

export async function bulkDeleteSubjectsForUser(
  userId: string,
  data: BulkDeleteSubjectsForm,
): Promise<BulkSubjectMutationResult> {
  const existingSubjects = await getSubjectRecordsForUser(userId, data.ids);
  const missingSubjectIds = getMissingSubjectIds(data.ids, existingSubjects);

  if (missingSubjectIds.length > 0) {
    return actionError("subjects.notFound");
  }

  const attachmentPathnames = await Promise.all(
    data.ids.map((id) => getSubjectAttachmentPathnamesForUser(userId, id)),
  );

  await getDb()
    .delete(subject)
    .where(and(inArray(subject.id, data.ids), eq(subject.userId, userId)));

  await cleanupAttachmentPathnames(userId, attachmentPathnames.flat());

  return { success: true, ids: data.ids };
}
