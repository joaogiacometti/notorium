import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { attendanceMiss, subject } from "@/db/schema";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import type { AttendanceMissEntity } from "@/lib/server/api-contracts";

export async function getMissesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<AttendanceMissEntity[]> {
  const subjectFilters = getOwnedActiveSubjectFilters(userId);

  return getDb()
    .select({ attendanceMiss })
    .from(attendanceMiss)
    .innerJoin(subject, eq(attendanceMiss.subjectId, subject.id))
    .where(
      and(
        eq(attendanceMiss.subjectId, subjectId),
        eq(attendanceMiss.userId, userId),
        ...subjectFilters,
      ),
    )
    .orderBy(asc(attendanceMiss.missDate))
    .then((rows) => rows.map((row) => row.attendanceMiss));
}

export async function getMissRecordForUser(
  userId: string,
  missId: string,
): Promise<Pick<AttendanceMissEntity, "id" | "subjectId"> | null> {
  const subjectFilters = getOwnedActiveSubjectFilters(userId);

  const results = await getDb()
    .select({ id: attendanceMiss.id, subjectId: attendanceMiss.subjectId })
    .from(attendanceMiss)
    .innerJoin(subject, eq(attendanceMiss.subjectId, subject.id))
    .where(
      and(
        eq(attendanceMiss.id, missId),
        eq(attendanceMiss.userId, userId),
        ...subjectFilters,
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
  const results = await getDb()
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
