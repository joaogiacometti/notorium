"use server";

import {
  deleteMissForUser,
  recordMissForUser,
  removeAttendanceSettingsForUser,
  updateAttendanceSettingsForUser,
} from "@/features/attendance/mutations";
import {
  type AttendanceSettingsForm,
  attendanceSettingsSchema,
  type DeleteMissForm,
  deleteMissSchema,
  type RecordMissForm,
  type RemoveAttendanceSettingsForm,
  recordMissSchema,
  removeAttendanceSettingsSchema,
} from "@/features/attendance/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";
import { revalidateSubjectPages } from "@/lib/server/revalidate-views";

export async function updateAttendanceSettings(
  data: AttendanceSettingsForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    "attendance.updateAttendanceSettings",
    attendanceSettingsSchema,
    data,
    "attendance.invalidSettings",
    async (userId, parsedData) =>
      updateAttendanceSettingsForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateSubjectPages([result.subjectId]);
  }

  return result;
}

export async function removeAttendanceSettings(
  data: RemoveAttendanceSettingsForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    "attendance.removeAttendanceSettings",
    removeAttendanceSettingsSchema,
    data,
    "attendance.invalidSettings",
    async (userId, parsedData) =>
      removeAttendanceSettingsForUser(userId, parsedData.subjectId),
  );

  if (result.success) {
    revalidateSubjectPages([result.subjectId]);
  }

  return result;
}

export async function recordMiss(
  data: RecordMissForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    "attendance.recordMiss",
    recordMissSchema,
    data,
    "attendance.invalidMissData",
    async (userId, parsedData) => recordMissForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateSubjectPages([result.subjectId]);
  }

  return result;
}

export async function deleteMiss(
  data: DeleteMissForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    "attendance.deleteMiss",
    deleteMissSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => deleteMissForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateSubjectPages([result.subjectId]);
  }

  return result;
}
