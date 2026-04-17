"use server";

import { revalidatePath } from "next/cache";
import {
  deleteMissForUser,
  recordMissForUser,
  removeAttendanceSettingsForUser,
  updateAttendanceSettingsForUser,
} from "@/features/attendance/mutations";
import { getMissesBySubjectForUser } from "@/features/attendance/queries";
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
  const result = await runValidatedUserAction(
    attendanceSettingsSchema,
    data,
    "attendance.invalidSettings",
    async (userId, parsedData) =>
      updateAttendanceSettingsForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
  }

  return result;
}

export async function removeAttendanceSettings(
  subjectId: string,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const result = await removeAttendanceSettingsForUser(userId, subjectId);

  if (result.success) {
    revalidatePath(`/subjects/${subjectId}`);
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
  const result = await runValidatedUserAction(
    recordMissSchema,
    data,
    "attendance.invalidMissData",
    async (userId, parsedData) => recordMissForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
  }

  return result;
}

export async function deleteMiss(
  data: DeleteMissForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    deleteMissSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => deleteMissForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath(`/subjects/${result.subjectId}`);
  }

  return result;
}
