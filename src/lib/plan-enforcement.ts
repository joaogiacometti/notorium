"use server";

import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { assessment, flashcard, note, subject } from "@/db/schema";
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

export async function checkFlashcardLimit(
  userId: string,
  subjectId: string,
  plan: UserPlan,
): Promise<LimitCheckResult> {
  const limits = getPlanLimits(plan);

  if (limits.maxFlashcardsPerSubject === null) {
    return { allowed: true, current: 0, max: null };
  }

  const result = await db
    .select({ total: count() })
    .from(flashcard)
    .where(
      and(eq(flashcard.subjectId, subjectId), eq(flashcard.userId, userId)),
    );

  const current = result[0]?.total ?? 0;

  return {
    allowed: current < limits.maxFlashcardsPerSubject,
    current,
    max: limits.maxFlashcardsPerSubject,
  };
}

export async function checkFlashcardsAllowed(plan: UserPlan): Promise<boolean> {
  const limits = getPlanLimits(plan);
  return limits.flashcardsAllowed;
}
