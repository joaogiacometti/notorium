import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/index";
import { attendanceMiss, subject } from "@/db/schema";
import type { AttendanceMissEntity } from "@/lib/api/contracts";

export async function getMissesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<AttendanceMissEntity[]> {
  return db
    .select({ attendanceMiss })
    .from(attendanceMiss)
    .innerJoin(subject, eq(attendanceMiss.subjectId, subject.id))
    .where(
      and(
        eq(attendanceMiss.subjectId, subjectId),
        eq(attendanceMiss.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .orderBy(asc(attendanceMiss.missDate))
    .then((rows) => rows.map((row) => row.attendanceMiss));
}

export async function getMissRecordForUser(
  userId: string,
  missId: string,
): Promise<Pick<AttendanceMissEntity, "id" | "subjectId"> | null> {
  const results = await db
    .select({ id: attendanceMiss.id, subjectId: attendanceMiss.subjectId })
    .from(attendanceMiss)
    .innerJoin(subject, eq(attendanceMiss.subjectId, subject.id))
    .where(
      and(
        eq(attendanceMiss.id, missId),
        eq(attendanceMiss.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

export async function hasMissOnDateForUser(
  userId: string,
  subjectId: string,
  missDate: string,
): Promise<boolean> {
  const results = await db
    .select({ id: attendanceMiss.id })
    .from(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.subjectId, subjectId),
        eq(attendanceMiss.missDate, missDate),
        eq(attendanceMiss.userId, userId),
      ),
    )
    .limit(1);

  return results.length > 0;
}
