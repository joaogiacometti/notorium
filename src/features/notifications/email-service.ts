import "server-only";
import { getServerEnv } from "@/env";
import {
  getUsersWithUpcomingAssessments,
  type NotificationAssessmentItem,
} from "@/features/notifications/queries";
import { getTodayIso } from "@/lib/dates/format";
import { sendEmail } from "@/lib/email/provider";
import {
  type AssessmentReminderItem,
  renderAssessmentReminderEmail,
} from "@/lib/email/templates/assessment-reminder";
import {
  claimUnsentAssessments,
  markAssessmentNotificationsFailed,
  markAssessmentNotificationsSent,
} from "./mutations";

export interface NotificationBatchResult {
  sent: number;
  failed: number;
}

export async function sendAssessmentReminderEmails(): Promise<NotificationBatchResult> {
  const env = getServerEnv();
  const appUrl = env.BETTER_AUTH_URL.replace(/\/$/, "");
  const todayIso = getTodayIso();

  const users = await getUsersWithUpcomingAssessments(todayIso);
  const toReminderItem = (
    assessment: NotificationAssessmentItem,
  ): AssessmentReminderItem => ({
    title: assessment.title,
    subjectName: assessment.subjectName,
    dueDate: assessment.dueDate,
    type: assessment.type as AssessmentReminderItem["type"],
  });

  let sent = 0;
  let failed = 0;

  for (const userRecord of users) {
    let claimedAssessmentIds: string[] = [];

    try {
      claimedAssessmentIds = await claimUnsentAssessments({
        assessmentIds: userRecord.assessments.map((a) => a.id),
        userId: userRecord.userId,
        notificationDate: todayIso,
      });

      if (claimedAssessmentIds.length === 0) {
        continue;
      }

      const claimedIdSet = new Set(claimedAssessmentIds);
      const claimedAssessments = userRecord.assessments.filter((assessment) =>
        claimedIdSet.has(assessment.id),
      );
      const firstAssessment = claimedAssessments[0];

      if (!firstAssessment) {
        continue;
      }

      const assessments: [AssessmentReminderItem, ...AssessmentReminderItem[]] =
        [
          toReminderItem(firstAssessment),
          ...claimedAssessments.slice(1).map(toReminderItem),
        ];

      const { subject, html } = renderAssessmentReminderEmail({
        userName: userRecord.name,
        assessments,
        appUrl,
      });

      const result = await sendEmail({
        to: userRecord.email,
        subject,
        html,
      });

      if (!result.success) {
        await markAssessmentNotificationsFailed({
          assessmentIds: claimedAssessmentIds,
          userId: userRecord.userId,
          notificationDate: todayIso,
        });
        failed++;
        console.error(
          `Failed to send assessment reminder to user ${userRecord.userId} (${userRecord.email}):`,
          result.error,
        );
        continue;
      }

      await markAssessmentNotificationsSent({
        assessmentIds: claimedAssessmentIds,
        userId: userRecord.userId,
        notificationDate: todayIso,
      });
      sent++;
    } catch (error) {
      if (claimedAssessmentIds.length > 0) {
        await markAssessmentNotificationsFailed({
          assessmentIds: claimedAssessmentIds,
          userId: userRecord.userId,
          notificationDate: todayIso,
        });
      }
      failed++;
      console.error(
        `Failed to process assessment reminder for user ${userRecord.userId} (${userRecord.email}):`,
        error,
      );
    }
  }

  return { sent, failed };
}
