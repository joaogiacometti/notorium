"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { attendanceMiss, subject } from "@/db/schema";
import type { AttendanceMissEntity, MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { actionError } from "@/lib/server-action-errors";
import {
  type AttendanceSettingsForm,
  attendanceSettingsSchema,
  type DeleteMissForm,
  deleteMissSchema,
  type RecordMissForm,
  recordMissSchema,
} from "@/lib/validations/attendance";

export async function updateAttendanceSettings(
  data: AttendanceSettingsForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = attendanceSettingsSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("attendance.invalidSettings");
  }

  if (parsed.data.maxMisses > parsed.data.totalClasses) {
    return actionError("attendance.maxMissesExceeded");
  }

  const existing = await db
    .select()
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.subjectId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existing.length === 0) {
    return actionError("subjects.notFound");
  }

  await db
    .update(subject)
    .set({
      totalClasses: parsed.data.totalClasses,
      maxMisses: parsed.data.maxMisses,
    })
    .where(
      and(eq(subject.id, parsed.data.subjectId), eq(subject.userId, userId)),
    );

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { success: true };
}

export async function getMissesBySubject(
  subjectId: string,
): Promise<AttendanceMissEntity[]> {
  const userId = await getAuthenticatedUserId();

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

export async function recordMiss(
  data: RecordMissForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = recordMissSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("attendance.invalidMissData");
  }

  const existingSubject = await db
    .select()
    .from(subject)
    .where(
      and(
        eq(subject.id, parsed.data.subjectId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existingSubject.length === 0) {
    return actionError("subjects.notFound");
  }

  const existingMiss = await db
    .select()
    .from(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.subjectId, parsed.data.subjectId),
        eq(attendanceMiss.missDate, parsed.data.missDate),
        eq(attendanceMiss.userId, userId),
      ),
    );

  if (existingMiss.length > 0) {
    return actionError("attendance.missAlreadyRecorded");
  }

  await db.insert(attendanceMiss).values({
    missDate: parsed.data.missDate,
    subjectId: parsed.data.subjectId,
    userId,
  });

  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { success: true };
}

export async function deleteMiss(
  data: DeleteMissForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = deleteMissSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("common.invalidRequest");
  }

  const existing = await db
    .select({ attendanceMiss })
    .from(attendanceMiss)
    .innerJoin(subject, eq(attendanceMiss.subjectId, subject.id))
    .where(
      and(
        eq(attendanceMiss.id, parsed.data.id),
        eq(attendanceMiss.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    );

  if (existing.length === 0) {
    return actionError("attendance.missNotFound");
  }

  const existingMiss = existing[0].attendanceMiss;

  await db
    .delete(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.id, parsed.data.id),
        eq(attendanceMiss.userId, userId),
      ),
    );

  revalidatePath(`/subjects/${existingMiss.subjectId}`);
  return { success: true };
}
