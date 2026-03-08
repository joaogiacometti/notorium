"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { attendanceMiss, subject } from "@/db/schema";
import {
  getMissesBySubjectForUser,
  getMissRecordForUser,
  hasMissOnDateForUser,
} from "@/features/attendance/queries";
import { revalidateAttendancePaths } from "@/features/attendance/revalidation";
import { getActiveSubjectRecordForUser } from "@/features/subjects/queries";
import { parseActionInput } from "@/lib/action-input";
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
  const parsed = parseActionInput(
    attendanceSettingsSchema,
    data,
    "attendance.invalidSettings",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  if (parsed.data.maxMisses > parsed.data.totalClasses) {
    return actionError("attendance.maxMissesExceeded");
  }

  const existing = await getActiveSubjectRecordForUser(
    userId,
    parsed.data.subjectId,
  );

  if (!existing) {
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

  revalidateAttendancePaths(parsed.data.subjectId);
  return { success: true };
}

export async function getMissesBySubject(
  subjectId: string,
): Promise<AttendanceMissEntity[]> {
  const userId = await getAuthenticatedUserId();
  return getMissesBySubjectForUser(userId, subjectId);
}

export async function recordMiss(
  data: RecordMissForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    recordMissSchema,
    data,
    "attendance.invalidMissData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existingSubject = await getActiveSubjectRecordForUser(
    userId,
    parsed.data.subjectId,
  );

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const existingMiss = await hasMissOnDateForUser(
    userId,
    parsed.data.subjectId,
    parsed.data.missDate,
  );

  if (existingMiss) {
    return actionError("attendance.missAlreadyRecorded");
  }

  await db.insert(attendanceMiss).values({
    missDate: parsed.data.missDate,
    subjectId: parsed.data.subjectId,
    userId,
  });

  revalidateAttendancePaths(parsed.data.subjectId);
  return { success: true };
}

export async function deleteMiss(
  data: DeleteMissForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    deleteMissSchema,
    data,
    "common.invalidRequest",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const existing = await getMissRecordForUser(userId, parsed.data.id);

  if (!existing) {
    return actionError("attendance.missNotFound");
  }

  await db
    .delete(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.id, parsed.data.id),
        eq(attendanceMiss.userId, userId),
      ),
    );

  revalidateAttendancePaths(existing.subjectId);
  return { success: true };
}
