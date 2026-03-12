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
import { runValidatedUserAction } from "@/lib/server/action-runner";
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
  return runValidatedUserAction(
    createAssessmentSchema,
    data,
    "assessments.invalidData",
    async (userId, parsedData) => {
      const result = await createAssessmentForUser(userId, parsedData);

      if (result.success) {
        revalidateAssessmentPaths(result.subjectId);
      }

      return result;
    },
  );
}

export async function editAssessment(
  data: EditAssessmentForm,
): Promise<EditAssessmentResult> {
  return runValidatedUserAction(
    editAssessmentSchema,
    data,
    "assessments.invalidData",
    async (userId, parsedData) => {
      const result = await editAssessmentForUser(userId, parsedData);

      if (result.success) {
        revalidateAssessmentPaths(result.subjectId);
      }

      return result;
    },
  );
}

export async function deleteAssessment(
  data: DeleteAssessmentForm,
): Promise<DeleteAssessmentResult> {
  return runValidatedUserAction(
    deleteAssessmentSchema,
    data,
    "common.invalidRequest",
    async (userId, parsedData) => {
      const result = await deleteAssessmentForUser(userId, parsedData);

      if (result.success) {
        revalidateAssessmentPaths(result.subjectId);
      }

      return result;
    },
  );
}
