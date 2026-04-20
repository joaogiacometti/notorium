import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment } from "@/db/schema";
import {
  countAssessmentsBySubjectForUser,
  getAssessmentRecordForUser,
  getAssessmentRecordsForUser,
} from "@/features/assessments/queries";
import type {
  BulkDeleteAssessmentsForm,
  BulkUpdateAssessmentStatusForm,
  CreateAssessmentForm,
  DeleteAssessmentForm,
  EditAssessmentForm,
} from "@/features/assessments/validation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import type {
  AssessmentEntity,
  BulkDeleteAssessmentsResult,
  BulkUpdateAssessmentStatusResult,
} from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { actionError } from "@/lib/server/server-action-errors";

export type CreateAssessmentMutationResult =
  | {
      success: true;
      assessment: AssessmentEntity;
      subjectId: string;
    }
  | ActionErrorResult;
export type EditAssessmentMutationResult =
  | {
      success: true;
      assessment: AssessmentEntity;
      subjectId: string;
    }
  | ActionErrorResult;
export type DeleteAssessmentMutationResult =
  | {
      success: true;
      id: string;
      subjectId: string;
    }
  | ActionErrorResult;

function getUniqueSubjectIds(records: Array<{ subjectId: string }>) {
  return Array.from(new Set(records.map((record) => record.subjectId)));
}

function getAssessmentMutationValues(
  values: Pick<
    CreateAssessmentForm,
    "title" | "description" | "type" | "status" | "dueDate" | "score" | "weight"
  >,
) {
  return {
    title: values.title,
    description: values.description || null,
    type: values.type,
    status: values.status,
    dueDate: values.dueDate ?? null,
    score: values.score?.toString() ?? null,
    weight: values.weight?.toString() ?? null,
  };
}

export async function createAssessmentForUser(
  userId: string,
  data: CreateAssessmentForm,
): Promise<CreateAssessmentMutationResult> {
  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    data.subjectId,
  );

  const current = await countAssessmentsBySubjectForUser(
    userId,
    data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (current >= LIMITS.maxAssessmentsPerSubject) {
    return actionError("limits.assessmentLimit", {
      errorParams: { max: LIMITS.maxAssessmentsPerSubject },
    });
  }

  const [createdAssessment] = await getDb()
    .insert(assessment)
    .values({
      subjectId: data.subjectId,
      userId,
      ...getAssessmentMutationValues(data),
    })
    .returning();

  return {
    success: true,
    assessment: createdAssessment,
    subjectId: data.subjectId,
  };
}

export async function editAssessmentForUser(
  userId: string,
  data: EditAssessmentForm,
): Promise<EditAssessmentMutationResult> {
  const existingAssessment = await getAssessmentRecordForUser(userId, data.id);

  if (!existingAssessment) {
    return actionError("assessments.notFound");
  }

  const [updatedAssessment] = await getDb()
    .update(assessment)
    .set(getAssessmentMutationValues(data))
    .where(eq(assessment.id, data.id))
    .returning();

  return {
    success: true,
    assessment: updatedAssessment,
    subjectId: existingAssessment.subjectId,
  };
}

export async function deleteAssessmentForUser(
  userId: string,
  data: DeleteAssessmentForm,
): Promise<DeleteAssessmentMutationResult> {
  const existingAssessment = await getAssessmentRecordForUser(userId, data.id);

  if (!existingAssessment) {
    return actionError("assessments.notFound");
  }

  await getDb().delete(assessment).where(eq(assessment.id, data.id));

  return {
    success: true,
    id: data.id,
    subjectId: existingAssessment.subjectId,
  };
}

export async function bulkDeleteAssessmentsForUser(
  userId: string,
  data: BulkDeleteAssessmentsForm,
): Promise<BulkDeleteAssessmentsResult> {
  const existingAssessments = await getAssessmentRecordsForUser(
    userId,
    data.ids,
  );

  if (existingAssessments.length !== data.ids.length) {
    return actionError("assessments.notFound");
  }

  await getDb().delete(assessment).where(inArray(assessment.id, data.ids));

  return {
    success: true,
    ids: data.ids,
    subjectIds: getUniqueSubjectIds(existingAssessments),
  };
}

export async function bulkUpdateAssessmentStatusForUser(
  userId: string,
  data: BulkUpdateAssessmentStatusForm,
): Promise<BulkUpdateAssessmentStatusResult> {
  const existingAssessments = await getAssessmentRecordsForUser(
    userId,
    data.ids,
  );

  if (existingAssessments.length !== data.ids.length) {
    return actionError("assessments.notFound");
  }

  await getDb()
    .update(assessment)
    .set({ status: data.status })
    .where(inArray(assessment.id, data.ids));

  return {
    success: true,
    ids: data.ids,
    status: data.status,
    subjectIds: getUniqueSubjectIds(existingAssessments),
  };
}
