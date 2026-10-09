import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, assessmentAttachment, subject } from "@/db/schema";
import {
  type GeneratedStudyTask,
  planStudyTaskSync,
  type StudyTaskSyncPlan,
} from "@/features/study-schedule/sync-plan";
import {
  buildStudyWeekOccurrences,
  type StudyWeekOccurrence,
} from "@/features/study-schedule/utils";
import type { StudyScheduleForm } from "@/features/study-schedule/validation";
import { getOwnedAcademicSubjectFilters } from "@/features/subjects/query-helpers";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type StudyScheduleMutationResult =
  | { success: true; subjectId: string }
  | ActionErrorResult;

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

interface StudyScheduleValues {
  studyWeekday: number | null;
  studyTermStart: string | null;
  studyTermEnd: string | null;
}

interface StudyScheduleScope {
  userId: string;
  subjectId: string;
}

const CLEARED_SCHEDULE: StudyScheduleValues = {
  studyWeekday: null,
  studyTermStart: null,
  studyTermEnd: null,
};

/**
 * Saves a subject's weekly class day and term, then syncs its study tasks in
 * place (see `planStudyTaskSync`): untouched pending weeks are moved, edited
 * and completed tasks are never deleted, and missing weeks are created.
 *
 * @example
 * await saveStudyScheduleForUser(userId, { subjectId, weekday: 3, termStart, termEnd });
 */
export async function saveStudyScheduleForUser(
  userId: string,
  data: StudyScheduleForm,
): Promise<StudyScheduleMutationResult> {
  return syncStudySchedule(
    { userId, subjectId: data.subjectId },
    {
      studyWeekday: data.weekday,
      studyTermStart: data.termStart,
      studyTermEnd: data.termEnd,
    },
  );
}

/**
 * Clears a subject's study schedule. Untouched pending tasks are deleted;
 * completed or edited ones are kept as standalone study tasks.
 *
 * @example
 * await removeStudyScheduleForUser(userId, subjectId);
 */
export async function removeStudyScheduleForUser(
  userId: string,
  subjectId: string,
): Promise<StudyScheduleMutationResult> {
  return syncStudySchedule({ userId, subjectId }, CLEARED_SCHEDULE);
}

async function syncStudySchedule(
  scope: StudyScheduleScope,
  nextSchedule: StudyScheduleValues,
): Promise<StudyScheduleMutationResult> {
  const found = await getDb().transaction(async (tx) => {
    const previousSchedule = await lockStudySchedule(tx, scope);
    if (!previousSchedule) return false;

    const tasks = await getGeneratedStudyTasks(tx, scope);
    const plan = planStudyTaskSync(
      tasks,
      toOccurrences(previousSchedule),
      toOccurrences(nextSchedule),
    );
    await tx
      .update(subject)
      .set(nextSchedule)
      .where(eq(subject.id, scope.subjectId));
    await applyStudyTaskSyncPlan(tx, scope, plan);
    return true;
  });

  if (!found) return actionError("subjects.notFound");
  return { success: true, subjectId: scope.subjectId };
}

function toOccurrences(schedule: StudyScheduleValues): StudyWeekOccurrence[] {
  const { studyWeekday, studyTermStart, studyTermEnd } = schedule;
  if (studyWeekday === null || !studyTermStart || !studyTermEnd) return [];
  return buildStudyWeekOccurrences(studyWeekday, studyTermStart, studyTermEnd);
}

/**
 * Row lock serializes concurrent saves/removals for one subject (double submit,
 * two tabs), so each sync plans against the previous one's committed tasks.
 */
async function lockStudySchedule(
  tx: Transaction,
  scope: StudyScheduleScope,
): Promise<StudyScheduleValues | null> {
  const rows = await tx
    .select({
      studyWeekday: subject.studyWeekday,
      studyTermStart: subject.studyTermStart,
      studyTermEnd: subject.studyTermEnd,
    })
    .from(subject)
    .where(
      and(
        eq(subject.id, scope.subjectId),
        ...getOwnedAcademicSubjectFilters(scope.userId),
      ),
    )
    .for("update");

  return rows[0] ?? null;
}

async function getGeneratedStudyTasks(
  tx: Transaction,
  scope: StudyScheduleScope,
): Promise<GeneratedStudyTask[]> {
  const rows = await tx
    .select({
      id: assessment.id,
      studyWeek: assessment.studyWeek,
      status: assessment.status,
      title: assessment.title,
      description: assessment.description,
      dueDate: assessment.dueDate,
      hasAttachments: sql<boolean>`exists (select 1 from ${assessmentAttachment} where ${assessmentAttachment.assessmentId} = ${assessment.id})`,
    })
    .from(assessment)
    .where(
      and(
        eq(assessment.subjectId, scope.subjectId),
        eq(assessment.userId, scope.userId),
        eq(assessment.type, "study"),
        isNotNull(assessment.studyWeek),
      ),
    );

  return rows.flatMap((row) =>
    row.studyWeek === null ? [] : [{ ...row, studyWeek: row.studyWeek }],
  );
}

async function applyStudyTaskSyncPlan(
  tx: Transaction,
  scope: StudyScheduleScope,
  plan: StudyTaskSyncPlan,
): Promise<void> {
  // Free weeks before inserting so the (subjectId, studyWeek) index allows reuse.
  if (plan.deleteIds.length > 0) {
    await tx.delete(assessment).where(inArray(assessment.id, plan.deleteIds));
  }
  if (plan.detachIds.length > 0) {
    await tx
      .update(assessment)
      .set({ studyWeek: null })
      .where(inArray(assessment.id, plan.detachIds));
  }
  for (const { id, occurrence } of plan.updates) {
    await tx
      .update(assessment)
      .set({ dueDate: occurrence.dueDate, title: occurrence.title })
      .where(eq(assessment.id, id));
  }
  await insertStudyTasks(tx, scope, plan.inserts);
}

async function insertStudyTasks(
  tx: Transaction,
  scope: StudyScheduleScope,
  occurrences: StudyWeekOccurrence[],
): Promise<void> {
  if (occurrences.length === 0) return;
  await tx
    .insert(assessment)
    .values(
      occurrences.map((item) => ({
        subjectId: scope.subjectId,
        userId: scope.userId,
        title: item.title,
        type: "study" as const,
        status: "pending" as const,
        dueDate: item.dueDate,
        studyWeek: item.week,
      })),
    )
    .onConflictDoNothing();
}
