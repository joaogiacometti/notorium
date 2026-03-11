"use server";

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
import { parseActionInput } from "@/lib/server/action-input";
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
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    createSubjectSchema,
    data,
    "subjects.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await createSubjectForUser(userId, parsed.data);

  if (result.success) {
    revalidateSubjectListPaths();
  }

  return result;
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

  const result = await editSubjectForUser(userId, parsed.data);

  if (result.success) {
    revalidateSubjectDetailPaths(parsed.data.id);
  }

  return result;
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

  const result = await archiveSubjectForUser(userId, parsed.data);

  if (result.success) {
    revalidateAllSubjectPaths(parsed.data.id);
  }

  return result;
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

  const result = await restoreSubjectForUser(userId, parsed.data);

  if (result.success) {
    revalidateAllSubjectPaths(parsed.data.id);
  }

  return result;
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

  const result = await deleteSubjectForUser(userId, parsed.data);

  if (result.success) {
    revalidateSubjectListPaths();
  }

  return result;
}
