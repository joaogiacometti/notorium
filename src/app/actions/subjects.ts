"use server";

import { revalidatePath } from "next/cache";
import {
  archiveSubjectForUser,
  createSubjectForUser,
  deleteSubjectForUser,
  editSubjectForUser,
  restoreSubjectForUser,
} from "@/features/subjects/mutations";
import {
  getActiveSubjectByIdForUser,
  getArchivedSubjectsForUser,
  getSubjectsForUser,
} from "@/features/subjects/queries";
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
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { MutationResult, SubjectEntity } from "@/lib/server/api-contracts";

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
  const result = await runValidatedUserAction(
    createSubjectSchema,
    data,
    "subjects.invalidData",
    async (userId, parsedData) => createSubjectForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/subjects");
    revalidatePath("/subjects/archived");
  }

  return result;
}

export async function editSubject(
  data: EditSubjectForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    editSubjectSchema,
    data,
    "subjects.invalidData",
    async (userId, parsedData) => editSubjectForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/subjects");
    revalidatePath(`/subjects/${data.id}`);
  }

  return result;
}

export async function archiveSubject(
  data: ArchiveSubjectForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    archiveSubjectSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => archiveSubjectForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/subjects");
    revalidatePath("/subjects/archived");
  }

  return result;
}

export async function restoreSubject(
  data: RestoreSubjectForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    restoreSubjectSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => restoreSubjectForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/subjects");
    revalidatePath("/subjects/archived");
  }

  return result;
}

export async function deleteSubject(
  data: DeleteSubjectForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    deleteSubjectSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => deleteSubjectForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/subjects");
  }

  return result;
}
