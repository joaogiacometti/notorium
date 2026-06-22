"use server";

import { revalidatePath } from "next/cache";
import { getSubjectDocumentsForUser } from "@/features/documents/queries";
import type { DocumentListItem } from "@/features/documents/types";
import {
  bulkDeleteSubjectsForUser,
  createSubjectForUser,
  deleteSubjectForUser,
  editSubjectForUser,
  moveSubjectForUser,
} from "@/features/subjects/mutations";
import {
  getAllSubjectsWithPathsForUser,
  getSubjectListItemsForUser,
  getSubjectsForUser,
} from "@/features/subjects/queries";
import {
  type BulkDeleteSubjectsForm,
  bulkDeleteSubjectsSchema,
  type CreateSubjectForm,
  createSubjectSchema,
  type DeleteSubjectForm,
  deleteSubjectSchema,
  type EditSubjectForm,
  editSubjectSchema,
  type MoveSubjectForm,
  moveSubjectSchema,
} from "@/features/subjects/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  BulkSubjectMutationResult,
  MoveSubjectResult,
  MutationResult,
  SubjectEntity,
  SubjectListItem,
  SubjectOption,
} from "@/lib/server/api-contracts";

export async function getSubjects(): Promise<SubjectEntity[]> {
  const userId = await getAuthenticatedUserId();
  return getSubjectsForUser(userId);
}

/**
 * Subjects with full `path` labels, for the flashcard subject pickers (create,
 * edit, move). Mirrors the old `getDecks` action.
 */
export async function getSubjectOptions(): Promise<SubjectOption[]> {
  const userId = await getAuthenticatedUserId();
  return getAllSubjectsWithPathsForUser(userId);
}

export async function getSubjectListItems(): Promise<SubjectListItem[]> {
  const userId = await getAuthenticatedUserId();
  return getSubjectListItemsForUser(userId);
}

/**
 * Lazily loads one subject's notes + mindmaps for the tree sidebar, fetched the
 * first time a subject node is expanded. Ownership is enforced by `userId`.
 */
export async function getSubjectDocuments(
  subjectId: string,
): Promise<DocumentListItem[]> {
  const userId = await getAuthenticatedUserId();
  return getSubjectDocumentsForUser(userId, subjectId);
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
    revalidatePath("/", "layout");
  }

  return result;
}

export async function moveSubject(
  data: MoveSubjectForm,
): Promise<MoveSubjectResult> {
  const result = await runValidatedUserAction(
    moveSubjectSchema,
    data,
    "subjects.invalidData",
    async (userId, parsedData) => moveSubjectForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/", "layout");
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
    revalidatePath("/", "layout");
    revalidatePath(`/subjects/${data.id}`);
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
    revalidatePath("/", "layout");
  }

  return result;
}

export async function bulkDeleteSubjects(
  data: BulkDeleteSubjectsForm,
): Promise<BulkSubjectMutationResult> {
  const result = await runValidatedUserAction(
    bulkDeleteSubjectsSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => bulkDeleteSubjectsForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/", "layout");
  }

  return result;
}
