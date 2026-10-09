"use server";

import { revalidatePath } from "next/cache";
import {
  removeStudyScheduleForUser,
  saveStudyScheduleForUser,
} from "@/features/study-schedule/mutations";
import {
  type RemoveStudyScheduleForm,
  removeStudyScheduleSchema,
  type StudyScheduleForm,
  studyScheduleSchema,
} from "@/features/study-schedule/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";

function revalidateStudyScheduleViews(subjectId: string): void {
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/planning");
  revalidatePath("/");
}

export async function saveStudySchedule(
  data: StudyScheduleForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    studyScheduleSchema,
    data,
    "studySchedule.invalid",
    async (userId, parsedData) => saveStudyScheduleForUser(userId, parsedData),
  );

  if (result.success) {
    revalidateStudyScheduleViews(result.subjectId);
  }

  return result;
}

export async function removeStudySchedule(
  data: RemoveStudyScheduleForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    removeStudyScheduleSchema,
    data,
    "studySchedule.invalid",
    async (userId, parsedData) =>
      removeStudyScheduleForUser(userId, parsedData.subjectId),
  );

  if (result.success) {
    revalidateStudyScheduleViews(result.subjectId);
  }

  return result;
}
