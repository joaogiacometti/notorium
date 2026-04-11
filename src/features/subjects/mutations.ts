import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, subject } from "@/db/schema";
import {
  countSubjectsForUser,
  getActiveSubjectRecordForUser,
  getArchivedSubjectRecordForUser,
  getSubjectRecordForUser,
} from "@/features/subjects/queries";
import { DEFAULT_DECK_NAME } from "@/features/decks/constants";
import type {
  ArchiveSubjectForm,
  CreateSubjectForm,
  DeleteSubjectForm,
  EditSubjectForm,
  RestoreSubjectForm,
} from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";
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
  values: Pick<CreateSubjectForm, "name" | "description">,
) {
  return {
    name: values.name,
    description: values.description ?? null,
  };
}

export async function createSubjectForUser(
  userId: string,
  data: CreateSubjectForm,
): Promise<SubjectMutationResult> {
  const current = await countSubjectsForUser(userId);

  if (current >= LIMITS.maxSubjects) {
    return actionError("limits.subjectLimit", {
      errorParams: { max: LIMITS.maxSubjects },
    });
  }

  await getDb().transaction(async (tx) => {
    const [inserted] = await tx
      .insert(subject)
      .values({ ...getSubjectMutationValues(data), userId })
      .returning();

    await tx.insert(deck).values({
      subjectId: inserted.id,
      userId,
      name: DEFAULT_DECK_NAME,
      isDefault: true,
    });
  });

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

  await getDb()
    .delete(subject)
    .where(and(eq(subject.id, data.id), eq(subject.userId, userId)));

  return { success: true };
}
