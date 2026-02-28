"use server";

import { and, count, eq, sum } from "drizzle-orm";
import { db } from "@/db/index";
import { assessment, note, noteImageAttachment, subject } from "@/db/schema";
import { getPlanLimits, type UserPlan } from "@/lib/plan-limits";

interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number | null;
}

export async function checkSubjectLimit(
  userId: string,
  plan: UserPlan,
): Promise<LimitCheckResult> {
  const limits = getPlanLimits(plan);

  if (limits.maxSubjects === null) {
    return { allowed: true, current: 0, max: null };
  }

  const result = await db
    .select({ total: count() })
    .from(subject)
    .where(eq(subject.userId, userId));

  const current = result[0]?.total ?? 0;

  return {
    allowed: current < limits.maxSubjects,
    current,
    max: limits.maxSubjects,
  };
}

export async function checkNoteLimit(
  userId: string,
  subjectId: string,
  plan: UserPlan,
): Promise<LimitCheckResult> {
  const limits = getPlanLimits(plan);

  if (limits.maxNotesPerSubject === null) {
    return { allowed: true, current: 0, max: null };
  }

  const result = await db
    .select({ total: count() })
    .from(note)
    .where(and(eq(note.subjectId, subjectId), eq(note.userId, userId)));

  const current = result[0]?.total ?? 0;

  return {
    allowed: current < limits.maxNotesPerSubject,
    current,
    max: limits.maxNotesPerSubject,
  };
}

export async function checkImageAllowed(plan: UserPlan): Promise<boolean> {
  const limits = getPlanLimits(plan);
  return limits.imagesAllowed;
}

export async function checkImageStorageLimit(
  userId: string,
  uploadSizeBytes: number,
  plan: UserPlan,
): Promise<LimitCheckResult> {
  const limits = getPlanLimits(plan);

  if (limits.maxImageStorageMb === null) {
    return { allowed: true, current: 0, max: null };
  }

  const maxBytes = limits.maxImageStorageMb * 1024 * 1024;

  const result = await db
    .select({ total: sum(noteImageAttachment.sizeBytes) })
    .from(noteImageAttachment)
    .where(eq(noteImageAttachment.userId, userId));

  const currentBytes = Number(result[0]?.total ?? 0);

  return {
    allowed: currentBytes + uploadSizeBytes <= maxBytes,
    current: currentBytes,
    max: maxBytes,
  };
}

export async function checkAssessmentLimit(
  userId: string,
  subjectId: string,
  plan: UserPlan,
): Promise<LimitCheckResult> {
  const limits = getPlanLimits(plan);

  if (limits.maxAssessmentsPerSubject === null) {
    return { allowed: true, current: 0, max: null };
  }

  const result = await db
    .select({ total: count() })
    .from(assessment)
    .where(
      and(eq(assessment.subjectId, subjectId), eq(assessment.userId, userId)),
    );

  const current = result[0]?.total ?? 0;

  return {
    allowed: current < limits.maxAssessmentsPerSubject,
    current,
    max: limits.maxAssessmentsPerSubject,
  };
}
