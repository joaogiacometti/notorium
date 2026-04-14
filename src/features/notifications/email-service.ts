import "server-only";
import { getServerEnv } from "@/env";
import {
  getUsersWithUpcomingAssessments,
  type NotificationAssessmentItem,
} from "@/features/notifications/queries";
import { sendEmail } from "@/lib/email/provider";
import {
  type AssessmentReminderItem,
  renderAssessmentReminderEmail,
} from "@/lib/email/templates/assessment-reminder";

export interface NotificationBatchResult {
  sent: number;
  failed: number;
}

export async function sendAssessmentReminderEmails(): Promise<NotificationBatchResult> {
  const env = getServerEnv();
  const appUrl = env.BETTER_AUTH_URL.replace(/\/$/, "");

  const users = await getUsersWithUpcomingAssessments();
  const toReminderItem = (
    assessment: NotificationAssessmentItem,
  ): AssessmentReminderItem => ({
    title: assessment.title,
    subjectName: assessment.subjectName,
    dueDate: assessment.dueDate,
    type: assessment.type as AssessmentReminderItem["type"],
  });

  const results = await Promise.allSettled(
    users.map(async (userRecord) => {
      const firstAssessment = userRecord.assessments[0];
      if (!firstAssessment) {
        return { success: false as const, error: "No assessments to notify" };
      }

      const assessments: [AssessmentReminderItem, ...AssessmentReminderItem[]] =
        [
          toReminderItem(firstAssessment),
          ...userRecord.assessments.slice(1).map(toReminderItem),
        ];

      const { subject, html } = renderAssessmentReminderEmail({
        userName: userRecord.name,
        assessments,
        appUrl,
      });

      return sendEmail({
        to: userRecord.email,
        subject,
        html,
      });
    }),
  );

  let sent = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
