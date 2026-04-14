import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { notificationLog } from "@/db/schema";

interface ClaimUnsentAssessmentsInput {
  assessmentIds: string[];
  userId: string;
  notificationDate: string;
}

export async function claimUnsentAssessments({
  assessmentIds,
  userId,
  notificationDate,
}: ClaimUnsentAssessmentsInput): Promise<string[]> {
  if (assessmentIds.length === 0) {
    return [];
  }

  const values = assessmentIds.map((assessmentId) => ({
    assessmentId,
    userId,
    notificationDate,
    status: "claimed" as const,
  }));

  const claimed = await getDb()
    .insert(notificationLog)
    .values(values)
    .onConflictDoUpdate({
      target: [
        notificationLog.assessmentId,
        notificationLog.userId,
        notificationLog.notificationDate,
      ],
      set: {
        status: "claimed",
        updatedAt: new Date(),
      },
      where: eq(notificationLog.status, "failed"),
    })
    .returning({
      assessmentId: notificationLog.assessmentId,
    });

  return claimed.map((row) => row.assessmentId);
}

interface UpdateAssessmentNotificationStatusInput {
  assessmentIds: string[];
  userId: string;
  notificationDate: string;
}

export async function markAssessmentNotificationsSent({
  assessmentIds,
  userId,
  notificationDate,
}: UpdateAssessmentNotificationStatusInput): Promise<void> {
  if (assessmentIds.length === 0) {
    return;
  }

  await getDb()
    .update(notificationLog)
    .set({
      status: "sent",
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(notificationLog.assessmentId, assessmentIds),
        eq(notificationLog.userId, userId),
        eq(notificationLog.notificationDate, notificationDate),
        eq(notificationLog.status, "claimed"),
      ),
    );
}

export async function markAssessmentNotificationsFailed({
  assessmentIds,
  userId,
  notificationDate,
}: UpdateAssessmentNotificationStatusInput): Promise<void> {
  if (assessmentIds.length === 0) {
    return;
  }

  await getDb()
    .update(notificationLog)
    .set({
      status: "failed",
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(notificationLog.assessmentId, assessmentIds),
        eq(notificationLog.userId, userId),
        eq(notificationLog.notificationDate, notificationDate),
        eq(notificationLog.status, "claimed"),
      ),
    );
}
