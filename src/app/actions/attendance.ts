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
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  AttendanceMissEntity,
  MutationResult,
} from "@/lib/server/api-contracts";

export async function updateAttendanceSettings(
  data: AttendanceSettingsForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    attendanceSettingsSchema,
    data,
    "attendance.invalidSettings",
    async (userId, parsedData) => {
      const result = await updateAttendanceSettingsForUser(userId, parsedData);

      if (result.success) {
        revalidateAttendancePaths(result.subjectId);
      }

      return result;
    },
  );
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
  return runValidatedUserAction(
    recordMissSchema,
    data,
    "attendance.invalidMissData",
    async (userId, parsedData) => {
      const result = await recordMissForUser(userId, parsedData);

      if (result.success) {
        revalidateAttendancePaths(result.subjectId);
      }

      return result;
    },
  );
}

export async function deleteMiss(
  data: DeleteMissForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    deleteMissSchema,
    data,
    "common.invalidRequest",
    async (userId, parsedData) => {
      const result = await deleteMissForUser(userId, parsedData);

      if (result.success) {
        revalidateAttendancePaths(result.subjectId);
      }

      return result;
    },
  );
}
