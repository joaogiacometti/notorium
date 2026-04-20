"use server";

import { revalidatePath } from "next/cache";
import {
  bulkDeleteAssessmentsForUser,
  bulkUpdateAssessmentStatusForUser,
  createAssessmentForUser,
  deleteAssessmentForUser,
  editAssessmentForUser,
} from "@/features/assessments/mutations";
import {
  getAssessmentsBySubjectForUser,
  getAssessmentsForUser,
  getPlanningAssessmentsPageForUser,
} from "@/features/assessments/queries";
import {
  type BulkDeleteAssessmentsForm,
  type BulkUpdateAssessmentStatusForm,
  bulkDeleteAssessmentsSchema,
  bulkUpdateAssessmentStatusSchema,
  type CreateAssessmentForm,
  createAssessmentSchema,
  type DeleteAssessmentForm,
  deleteAssessmentSchema,
  type EditAssessmentForm,
  editAssessmentSchema,
  type PlanningAssessmentsQueryInput,
  planningAssessmentsQuerySchema,
} from "@/features/assessments/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  AssessmentEntity,
  BulkDeleteAssessmentsResult,
  BulkUpdateAssessmentStatusResult,
  CreateAssessmentResult,
  DeleteAssessmentResult,
  EditAssessmentResult,
  PlanningAssessmentsPage,
} from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

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

export async function getPlanningAssessmentsPage(
  data: PlanningAssessmentsQueryInput,
): Promise<PlanningAssessmentsPage | ActionErrorResult> {
  return runValidatedUserAction(
    planningAssessmentsQuerySchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) =>
      getPlanningAssessmentsPageForUser(userId, parsedData),
  );
}

export async function createAssessment(
  data: CreateAssessmentForm,
): Promise<CreateAssessmentResult> {
  const result = await runValidatedUserAction(
    createAssessmentSchema,
    data,
    "assessments.invalidData",
    async (userId, parsedData) => createAssessmentForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.assessment.subjectId}`);
  }

  return result;
}

export async function editAssessment(
  data: EditAssessmentForm,
): Promise<EditAssessmentResult> {
  const result = await runValidatedUserAction(
    editAssessmentSchema,
    data,
    "assessments.invalidData",
    async (userId, parsedData) => editAssessmentForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.assessment.subjectId}`);
  }

  return result;
}

export async function deleteAssessment(
  data: DeleteAssessmentForm,
): Promise<DeleteAssessmentResult> {
  const result = await runValidatedUserAction(
    deleteAssessmentSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => deleteAssessmentForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
  }

  return result;
}

export async function bulkDeleteAssessments(
  data: BulkDeleteAssessmentsForm,
): Promise<BulkDeleteAssessmentsResult> {
  const result = await runValidatedUserAction(
    bulkDeleteAssessmentsSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) =>
      bulkDeleteAssessmentsForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/planning");

    for (const subjectId of result.subjectIds) {
      revalidatePath(`/subjects/${subjectId}`);
    }
  }

  return result;
}

export async function bulkUpdateAssessmentStatus(
  data: BulkUpdateAssessmentStatusForm,
): Promise<BulkUpdateAssessmentStatusResult> {
  const result = await runValidatedUserAction(
    bulkUpdateAssessmentStatusSchema,
    data,
    "assessments.invalidData",
    async (userId, parsedData) =>
      bulkUpdateAssessmentStatusForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/planning");

    for (const subjectId of result.subjectIds) {
      revalidatePath(`/subjects/${subjectId}`);
    }
  }

  return result;
}
