"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { attendanceMiss, subject } from "@/db/schema";
import type { AttendanceMissEntity, MutationResult } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
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
    return { error: "Invalid attendance settings." };
  }

  if (parsed.data.maxMisses > parsed.data.totalClasses) {
    return { error: "Max misses cannot exceed total classes." };
  }

  const existing = await db
    .select()
    .from(subject)
    .where(
      and(eq(subject.id, parsed.data.subjectId), eq(subject.userId, userId)),
    );

  if (existing.length === 0) {
    return { error: "Subject not found." };
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
    .select()
    .from(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.subjectId, subjectId),
        eq(attendanceMiss.userId, userId),
      ),
    )
    .orderBy(asc(attendanceMiss.missDate));
}

export async function recordMiss(
  data: RecordMissForm,
): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = recordMissSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid miss data." };
  }

  const existingSubject = await db
    .select()
    .from(subject)
    .where(
      and(eq(subject.id, parsed.data.subjectId), eq(subject.userId, userId)),
    );

  if (existingSubject.length === 0) {
    return { error: "Subject not found." };
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
    return { error: "A miss is already recorded for this date." };
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
    return { error: "Invalid request." };
  }

  const existing = await db
    .select()
    .from(attendanceMiss)
    .where(
      and(
        eq(attendanceMiss.id, parsed.data.id),
        eq(attendanceMiss.userId, userId),
      ),
    );

  if (existing.length === 0) {
    return { error: "Miss record not found." };
  }

  const existingMiss = existing[0];

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
