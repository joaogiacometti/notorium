"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { assessment } from "@/db/schema";
import {
  countAssessmentsBySubjectForUser,
  getAssessmentRecordForUser,
  getAssessmentsBySubjectForUser,
  getAssessmentsForUser,
} from "@/features/assessments/queries";
import { revalidateAssessmentPaths } from "@/features/assessments/revalidation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import { parseActionInput } from "@/lib/action-input";
import type { AssessmentEntity, MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { LIMITS } from "@/lib/limits";
import { actionError } from "@/lib/server-action-errors";
import {
  type CreateAssessmentForm,
  createAssessmentSchema,
  type DeleteAssessmentForm,
  deleteAssessmentSchema,
  type EditAssessmentForm,
  editAssessmentSchema,
} from "@/lib/validations/assessments";

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
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    createAssessmentSchema,
    data,
    "assessments.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    parsed.data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const current = await countAssessmentsBySubjectForUser(
    userId,
    parsed.data.subjectId,
  );

  if (current >= LIMITS.maxAssessmentsPerSubject) {
    return actionError("limits.assessmentLimit", {
      errorParams: { max: LIMITS.maxAssessmentsPerSubject },
    });
  }

  await db.insert(assessment).values({
    subjectId: parsed.data.subjectId,
    userId,
    ...getAssessmentMutationValues(parsed.data),
  });

  revalidateAssessmentPaths(parsed.data.subjectId);
  return { success: true };
}

export async function editAssessment(
  data: EditAssessmentForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    editAssessmentSchema,
    data,
    "assessments.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingAssessment = await getAssessmentRecordForUser(
    userId,
    parsed.data.id,
  );

  if (!existingAssessment) {
    return actionError("assessments.notFound");
  }

  await db
    .update(assessment)
    .set(getAssessmentMutationValues(parsed.data))
    .where(eq(assessment.id, parsed.data.id));

  revalidateAssessmentPaths(existingAssessment.subjectId);
  return { success: true };
}

export async function deleteAssessment(
  data: DeleteAssessmentForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    deleteAssessmentSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingAssessment = await getAssessmentRecordForUser(
    userId,
    parsed.data.id,
  );

  if (!existingAssessment) {
    return actionError("assessments.notFound");
  }

  await db.delete(assessment).where(eq(assessment.id, parsed.data.id));

  revalidateAssessmentPaths(existingAssessment.subjectId);
  return { success: true };
}
