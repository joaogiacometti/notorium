"use server";

import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db/index";
import { assessment, attendanceMiss, subject } from "@/db/schema";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

export interface CalendarData {
  assessments: (AssessmentEntity & { subjectName: string })[];
  misses: (AttendanceMissEntity & { subjectName: string })[];
  subjects: Pick<SubjectEntity, "id" | "name">[];
}

export async function getCalendarEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarData> {
  const userId = await getAuthenticatedUserId();

  const [assessmentRows, missRows, subjectRows] = await Promise.all([
    db
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
    db
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
    db
      .select({ id: subject.id, name: subject.name })
      .from(subject)
      .where(and(eq(subject.userId, userId), isNull(subject.archivedAt))),
  ]);

  return {
    assessments: assessmentRows.map((r) => ({
      ...r.assessment,
      subjectName: r.subjectName,
    })),
    misses: missRows.map((r) => ({
      ...r.attendanceMiss,
      subjectName: r.subjectName,
    })),
    subjects: subjectRows,
  };
}
