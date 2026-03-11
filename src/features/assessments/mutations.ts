import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { assessment } from "@/db/schema";
import {
  countAssessmentsBySubjectForUser,
  getAssessmentRecordForUser,
} from "@/features/assessments/queries";
import type {
  CreateAssessmentForm,
  DeleteAssessmentForm,
  EditAssessmentForm,
} from "@/features/assessments/validation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type AssessmentMutationResult =
  | {
      success: true;
      subjectId: string;
    }
  | ActionErrorResult;

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
): Promise<AssessmentMutationResult> {
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

  await db.insert(assessment).values({
    subjectId: data.subjectId,
    userId,
    ...getAssessmentMutationValues(data),
  });

  return { success: true, subjectId: data.subjectId };
}

export async function editAssessmentForUser(
  userId: string,
  data: EditAssessmentForm,
): Promise<AssessmentMutationResult> {
  const existingAssessment = await getAssessmentRecordForUser(userId, data.id);

  if (!existingAssessment) {
    return actionError("assessments.notFound");
  }

  await db
    .update(assessment)
    .set(getAssessmentMutationValues(data))
    .where(eq(assessment.id, data.id));

  return { success: true, subjectId: existingAssessment.subjectId };
}

export async function deleteAssessmentForUser(
  userId: string,
  data: DeleteAssessmentForm,
): Promise<AssessmentMutationResult> {
  const existingAssessment = await getAssessmentRecordForUser(userId, data.id);

  if (!existingAssessment) {
    return actionError("assessments.notFound");
  }

  await db.delete(assessment).where(eq(assessment.id, data.id));

  return { success: true, subjectId: existingAssessment.subjectId };
}
