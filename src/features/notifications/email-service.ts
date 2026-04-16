import "server-only";
import { getServerEnv } from "@/env";
import {
  claimUnsentAssessments,
  markAssessmentNotificationsFailed,
  markAssessmentNotificationsSent,
} from "@/features/notifications/mutations";
import {
  getUsersWithUpcomingAssessments,
  type NotificationAssessmentItem,
  type UserWithUpcomingAssessments,
} from "@/features/notifications/queries";
import { getTodayIso } from "@/lib/dates/format";
import { sendEmail } from "@/lib/email/provider";
import {
  type AssessmentReminderItem,
  renderAssessmentReminderEmail,
} from "@/lib/email/templates/assessment-reminder";

export interface NotificationBatchResult {
  sent: number;
  failed: number;
}

function toReminderItem(
  assessment: NotificationAssessmentItem,
): AssessmentReminderItem {
  return {
    title: assessment.title,
    subjectName: assessment.subjectName,
    dueDate: assessment.dueDate,
    type: assessment.type as AssessmentReminderItem["type"],
  };
}

function getClaimedAssessments(
  assessments: NotificationAssessmentItem[],
  claimedAssessmentIds: string[],
): NotificationAssessmentItem[] {
  const claimedIdSet = new Set(claimedAssessmentIds);

  return assessments.filter((assessment) => claimedIdSet.has(assessment.id));
}

function getReminderItems(
  assessments: NotificationAssessmentItem[],
): [AssessmentReminderItem, ...AssessmentReminderItem[]] | null {
  const firstAssessment = assessments[0];

  if (!firstAssessment) {
    return null;
  }

  return [
    toReminderItem(firstAssessment),
    ...assessments.slice(1).map(toReminderItem),
  ];
}

async function markClaimedAssessmentNotificationsFailed(input: {
  claimedAssessmentIds: string[];
  userId: string;
  notificationDate: string;
}) {
  if (input.claimedAssessmentIds.length === 0) {
    return;
  }

  await markAssessmentNotificationsFailed({
    assessmentIds: input.claimedAssessmentIds,
    userId: input.userId,
    notificationDate: input.notificationDate,
  });
}

async function processUserAssessmentReminders(input: {
  userRecord: UserWithUpcomingAssessments;
  appUrl: string;
  notificationDate: string;
}): Promise<"sent" | "failed" | "skipped"> {
  let claimedAssessmentIds: string[] = [];

  try {
    claimedAssessmentIds = await claimUnsentAssessments({
      assessmentIds: input.userRecord.assessments.map(
        (assessment) => assessment.id,
      ),
      userId: input.userRecord.userId,
      notificationDate: input.notificationDate,
    });

    if (claimedAssessmentIds.length === 0) {
      return "skipped";
    }

    const claimedAssessments = getClaimedAssessments(
      input.userRecord.assessments,
      claimedAssessmentIds,
    );
    const reminderItems = getReminderItems(claimedAssessments);

    if (!reminderItems) {
      return "skipped";
    }

    const { subject, html } = renderAssessmentReminderEmail({
      userName: input.userRecord.name,
      assessments: reminderItems,
      appUrl: input.appUrl,
    });

    const result = await sendEmail({
      to: input.userRecord.email,
      subject,
      html,
    });

    if (!result.success) {
      await markClaimedAssessmentNotificationsFailed({
        claimedAssessmentIds,
        userId: input.userRecord.userId,
        notificationDate: input.notificationDate,
      });
      console.error(
        `Failed to send assessment reminder to user ${input.userRecord.userId} (${input.userRecord.email}):`,
        result.error,
      );
      return "failed";
    }

    await markAssessmentNotificationsSent({
      assessmentIds: claimedAssessmentIds,
      userId: input.userRecord.userId,
      notificationDate: input.notificationDate,
    });

    return "sent";
  } catch (error) {
    await markClaimedAssessmentNotificationsFailed({
      claimedAssessmentIds,
      userId: input.userRecord.userId,
      notificationDate: input.notificationDate,
    });
    console.error(
      `Failed to process assessment reminder for user ${input.userRecord.userId} (${input.userRecord.email}):`,
      error,
    );
    return "failed";
  }
}

export async function sendAssessmentReminderEmails(): Promise<NotificationBatchResult> {
  const env = getServerEnv();
  const appUrl = env.BETTER_AUTH_URL.replace(/\/$/, "");
  const todayIso = getTodayIso();

  const users = await getUsersWithUpcomingAssessments(todayIso);

  let sent = 0;
  let failed = 0;

  for (const userRecord of users) {
    const status = await processUserAssessmentReminders({
      userRecord,
      appUrl,
      notificationDate: todayIso,
    });

    if (status === "sent") {
      sent++;
      continue;
    }

    if (status === "failed") {
      failed++;
    }
  }

  return { sent, failed };
}
