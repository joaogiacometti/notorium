import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, attendanceMiss, subject } from "@/db/schema";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

export interface PlanningCalendarData {
  assessments: (AssessmentEntity & { subjectName: string })[];
  misses: (AttendanceMissEntity & { subjectName: string })[];
  subjects: Pick<SubjectEntity, "id" | "name">[];
}

export async function getPlanningCalendarDataForUser(
  userId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<PlanningCalendarData> {
  const [assessmentRows, missRows, subjectRows] = await Promise.all([
    getDb()
      .select({ assessment, subjectName: subject.name })
      .from(assessment)
      .innerJoin(subject, eq(assessment.subjectId, subject.id))
      .where(
        and(
          eq(assessment.userId, userId),
          eq(subject.userId, userId),
          isNull(subject.archivedAt),
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
          eq(subject.userId, userId),
          isNull(subject.archivedAt),
          gte(attendanceMiss.missDate, rangeStart),
          lte(attendanceMiss.missDate, rangeEnd),
        ),
      ),
    getDb()
      .select({ id: subject.id, name: subject.name })
      .from(subject)
      .where(and(eq(subject.userId, userId), isNull(subject.archivedAt))),
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
    subjects: subjectRows,
  };
}
