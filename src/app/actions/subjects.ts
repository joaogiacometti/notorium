"use server";

import { revalidatePath } from "next/cache";
import {
  bulkDeleteSubjectsForUser,
  createSubjectForUser,
  deleteSubjectForUser,
  editSubjectForUser,
  moveSubjectForUser,
  type SubjectMutationResult,
} from "@/features/subjects/mutations";
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
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  BulkSubjectMutationResult,
  MoveSubjectResult,
  MutationResult,
} from "@/lib/server/api-contracts";

export async function createSubject(
  data: CreateSubjectForm,
): Promise<SubjectMutationResult> {
  const result = await runValidatedUserAction(
    "subjects.createSubject",
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
    "subjects.moveSubject",
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
    "subjects.editSubject",
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
    "subjects.deleteSubject",
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
    "subjects.bulkDeleteSubjects",
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
