"use server";

import {
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
  return runValidatedUserAction(
    createAssessmentSchema,
    data,
    "assessments.invalidData",
    async (userId, parsedData) => createAssessmentForUser(userId, parsedData),
  );
}

export async function editAssessment(
  data: EditAssessmentForm,
): Promise<EditAssessmentResult> {
  return runValidatedUserAction(
    editAssessmentSchema,
    data,
    "assessments.invalidData",
    async (userId, parsedData) => editAssessmentForUser(userId, parsedData),
  );
}

export async function deleteAssessment(
  data: DeleteAssessmentForm,
): Promise<DeleteAssessmentResult> {
  return runValidatedUserAction(
    deleteAssessmentSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => deleteAssessmentForUser(userId, parsedData),
  );
}
