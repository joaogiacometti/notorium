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
} from "@/features/assessments/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  BulkDeleteAssessmentsResult,
  BulkUpdateAssessmentStatusResult,
  CreateAssessmentResult,
  DeleteAssessmentResult,
  EditAssessmentResult,
} from "@/lib/server/api-contracts";

export async function createAssessment(
  data: CreateAssessmentForm,
): Promise<CreateAssessmentResult> {
  const result = await runValidatedUserAction(
    "assessments.createAssessment",
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
    "assessments.editAssessment",
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
    "assessments.deleteAssessment",
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
    "assessments.bulkDeleteAssessments",
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
    "assessments.bulkUpdateAssessmentStatus",
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
