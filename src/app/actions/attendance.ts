"use server";

import {
  deleteMissForUser,
  recordMissForUser,
  updateAttendanceSettingsForUser,
} from "@/features/attendance/mutations";
import { getMissesBySubjectForUser } from "@/features/attendance/queries";
import { revalidateAttendancePaths } from "@/features/attendance/revalidation";
import {
  type AttendanceSettingsForm,
  attendanceSettingsSchema,
  type DeleteMissForm,
  deleteMissSchema,
  type RecordMissForm,
  recordMissSchema,
} from "@/features/attendance/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { parseActionInput } from "@/lib/server/action-input";
import type {
  AttendanceMissEntity,
  MutationResult,
} from "@/lib/server/api-contracts";

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

  const result = await updateAttendanceSettingsForUser(userId, parsed.data);

  if (result.success) {
    revalidateAttendancePaths(result.subjectId);
  }

  return result;
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

  const result = await recordMissForUser(userId, parsed.data);

  if (result.success) {
    revalidateAttendancePaths(result.subjectId);
  }

  return result;
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

  const result = await deleteMissForUser(userId, parsed.data);

  if (result.success) {
    revalidateAttendancePaths(result.subjectId);
  }

  return result;
}
