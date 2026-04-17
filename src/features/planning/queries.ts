import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, attendanceMiss, subject } from "@/db/schema";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
} from "@/lib/server/api-contracts";

export interface PlanningCalendarData {
  assessments: (AssessmentEntity & { subjectName: string })[];
  misses: (AttendanceMissEntity & { subjectName: string })[];
}

export async function getPlanningCalendarDataForUser(
  userId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<PlanningCalendarData> {
  const subjectFilters = getOwnedActiveSubjectFilters(userId);

  const [assessmentRows, missRows] = await Promise.all([
    getDb()
      .select({ assessment, subjectName: subject.name })
      .from(assessment)
      .innerJoin(subject, eq(assessment.subjectId, subject.id))
      .where(
        and(
          eq(assessment.userId, userId),
          ...subjectFilters,
          gte(assessment.dueDate, rangeStart),
          lte(assessment.dueDate, rangeEnd),
        ),
      ),
    getDb()
      .select({ attendanceMiss, subjectName: subject.name })
      .from(attendanceMiss)
      .innerJoin(subject, eq(attendanceMiss.subjectId, subject.id))
      .where(
        and(
          eq(attendanceMiss.userId, userId),
          ...subjectFilters,
          gte(attendanceMiss.missDate, rangeStart),
          lte(attendanceMiss.missDate, rangeEnd),
        ),
      ),
  ]);

  return {
    assessments: assessmentRows.map((row) => ({
      ...row.assessment,
      subjectName: row.subjectName,
    })),
    misses: missRows.map((row) => ({
      ...row.attendanceMiss,
      subjectName: row.subjectName,
    })),
  };
}
