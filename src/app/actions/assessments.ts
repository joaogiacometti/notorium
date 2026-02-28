"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { assessment, subject } from "@/db/schema";
import type { AssessmentEntity, MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUser, getAuthenticatedUserId } from "@/lib/auth";
import { checkAssessmentLimit } from "@/lib/plan-enforcement";
import {
  type CreateAssessmentForm,
  createAssessmentSchema,
  type DeleteAssessmentForm,
  deleteAssessmentSchema,
  type EditAssessmentForm,
  editAssessmentSchema,
} from "@/lib/validations/assessments";

export async function getAssessmentsBySubject(
  subjectId: string,
): Promise<AssessmentEntity[]> {
  const userId = await getAuthenticatedUserId();

  return db
    .select()
    .from(assessment)
    .where(
      and(eq(assessment.subjectId, subjectId), eq(assessment.userId, userId)),
    )
    .orderBy(desc(assessment.updatedAt));
}

export async function getAssessments(): Promise<AssessmentEntity[]> {
  const userId = await getAuthenticatedUserId();

  return db
    .select()
    .from(assessment)
    .where(eq(assessment.userId, userId))
    .orderBy(desc(assessment.updatedAt));
}

export async function createAssessment(
  data: CreateAssessmentForm,
): Promise<MutationResult> {
  const { userId, plan } = await getAuthenticatedUser();
  const parsed = createAssessmentSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid assessment data." };
  }

  const existingSubject = await db
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(eq(subject.id, parsed.data.subjectId), eq(subject.userId, userId)),
    )
    .limit(1);

  if (existingSubject.length === 0) {
    return { error: "Subject not found." };
  }

  const limitCheck = await checkAssessmentLimit(
    userId,
    parsed.data.subjectId,
    plan,
  );

  if (!limitCheck.allowed) {
    return {
      error: `Plan limit: you can have up to ${limitCheck.max} assessments per subject.`,
    };
  }

  await db.insert(assessment).values({
    subjectId: parsed.data.subjectId,
    userId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    type: parsed.data.type,
    status: parsed.data.status,
    dueDate: parsed.data.dueDate ?? null,
    score: parsed.data.score?.toString() ?? null,
    weight: parsed.data.weight?.toString() ?? null,
  });

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  revalidatePath("/assessments");
  return { success: true };
}

export async function editAssessment(
  data: EditAssessmentForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = editAssessmentSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid assessment data." };
  }

  const existingAssessment = await db
    .select({ id: assessment.id, subjectId: assessment.subjectId })
    .from(assessment)
    .where(
      and(eq(assessment.id, parsed.data.id), eq(assessment.userId, userId)),
    )
    .limit(1);

  if (existingAssessment.length === 0) {
    return { error: "Assessment not found." };
  }

  await db
    .update(assessment)
    .set({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      status: parsed.data.status,
      dueDate: parsed.data.dueDate ?? null,
      score: parsed.data.score?.toString() ?? null,
      weight: parsed.data.weight?.toString() ?? null,
    })
    .where(
      and(eq(assessment.id, parsed.data.id), eq(assessment.userId, userId)),
    );

  revalidatePath(`/subjects/${existingAssessment[0].subjectId}`);
  revalidatePath("/assessments");
  return { success: true };
}

export async function deleteAssessment(
  data: DeleteAssessmentForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteAssessmentSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const existingAssessment = await db
    .select({ id: assessment.id, subjectId: assessment.subjectId })
    .from(assessment)
    .where(
      and(eq(assessment.id, parsed.data.id), eq(assessment.userId, userId)),
    )
    .limit(1);

  if (existingAssessment.length === 0) {
    return { error: "Assessment not found." };
  }

  await db
    .delete(assessment)
    .where(
      and(eq(assessment.id, parsed.data.id), eq(assessment.userId, userId)),
    );

  revalidatePath(`/subjects/${existingAssessment[0].subjectId}`);
  revalidatePath("/assessments");
  return { success: true };
}
