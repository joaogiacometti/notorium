"use server";

import {
  createAssessmentForUser,
  deleteAssessmentForUser,
  editAssessmentForUser,
} from "@/features/assessments/mutations";
import {
  getAssessmentsBySubjectForUser,
  getAssessmentsForUser,
} from "@/features/assessments/queries";
import { revalidateAssessmentPaths } from "@/features/assessments/revalidation";
import {
  type CreateAssessmentForm,
  createAssessmentSchema,
  type DeleteAssessmentForm,
  deleteAssessmentSchema,
  type EditAssessmentForm,
  editAssessmentSchema,
} from "@/features/assessments/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { parseActionInput } from "@/lib/server/action-input";
import type {
  AssessmentEntity,
  CreateAssessmentResult,
  DeleteAssessmentResult,
  EditAssessmentResult,
} from "@/lib/server/api-contracts";

export async function getAssessmentsBySubject(
  subjectId: string,
): Promise<AssessmentEntity[]> {
  const userId = await getAuthenticatedUserId();
  return getAssessmentsBySubjectForUser(userId, subjectId);
}

export async function getAssessments(): Promise<AssessmentEntity[]> {
  const userId = await getAuthenticatedUserId();
  return getAssessmentsForUser(userId);
}

export async function createAssessment(
  data: CreateAssessmentForm,
): Promise<CreateAssessmentResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    createAssessmentSchema,
    data,
    "assessments.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await createAssessmentForUser(userId, parsed.data);

  if (result.success) {
    revalidateAssessmentPaths(result.subjectId);
  }

  return result;
}

export async function editAssessment(
  data: EditAssessmentForm,
): Promise<EditAssessmentResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    editAssessmentSchema,
    data,
    "assessments.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await editAssessmentForUser(userId, parsed.data);

  if (result.success) {
    revalidateAssessmentPaths(result.subjectId);
  }

  return result;
}

export async function deleteAssessment(
  data: DeleteAssessmentForm,
): Promise<DeleteAssessmentResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    deleteAssessmentSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const result = await deleteAssessmentForUser(userId, parsed.data);

  if (result.success) {
    revalidateAssessmentPaths(result.subjectId);
  }

  return result;
}
