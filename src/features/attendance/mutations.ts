import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { attendanceMiss, subject } from "@/db/schema";
import {
  getMissRecordForUser,
  hasMissOnDateForUser,
} from "@/features/attendance/queries";
import type {
  AttendanceSettingsForm,
  DeleteMissForm,
  RecordMissForm,
} from "@/features/attendance/validation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type AttendanceMutationResult =
  | {
      success: true;
      subjectId: string;
    }
  | ActionErrorResult;

export async function updateAttendanceSettingsForUser(
  userId: string,
  data: AttendanceSettingsForm,
): Promise<AttendanceMutationResult> {
  const existing = await getActiveSubjectRecordForUser(userId, data.subjectId);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .update(subject)
    .set({
      totalClasses: data.totalClasses,
      maxMisses: data.maxMisses,
    })
    .where(and(eq(subject.id, data.subjectId), eq(subject.userId, userId)));

  return { success: true, subjectId: data.subjectId };
}

export async function recordMissForUser(
  userId: string,
  data: RecordMissForm,
): Promise<AttendanceMutationResult> {
  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    data.subjectId,
  );

  const existingMiss = await hasMissOnDateForUser(
    userId,
    data.subjectId,
    data.missDate,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (existingMiss) {
    return actionError("attendance.missAlreadyRecorded");
  }

  await getDb().insert(attendanceMiss).values({
    missDate: data.missDate,
    subjectId: data.subjectId,
    userId,
  });

  return { success: true, subjectId: data.subjectId };
}

export async function deleteMissForUser(
  userId: string,
  data: DeleteMissForm,
): Promise<AttendanceMutationResult> {
  const existing = await getMissRecordForUser(userId, data.id);

  if (!existing) {
    return actionError("attendance.missNotFound");
  }

  await getDb()
    .delete(attendanceMiss)
    .where(
      and(eq(attendanceMiss.id, data.id), eq(attendanceMiss.userId, userId)),
    );

  return { success: true, subjectId: existing.subjectId };
}

export async function removeAttendanceSettingsForUser(
  userId: string,
  subjectId: string,
): Promise<AttendanceMutationResult> {
  const existing = await getActiveSubjectRecordForUser(userId, subjectId);

  if (!existing) {
    return actionError("subjects.notFound");
  }

  await getDb()
    .delete(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.subjectId, subjectId),
        eq(attendanceMiss.userId, userId),
      ),
    );

  await getDb()
    .update(subject)
    .set({
      totalClasses: null,
      maxMisses: null,
    })
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)));

  return { success: true, subjectId };
}
