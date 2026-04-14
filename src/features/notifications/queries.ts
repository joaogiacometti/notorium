import "server-only";
import { and, eq, gte, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, notificationLog, subject, user } from "@/db/schema";

export interface NotificationAssessmentItem {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  subjectName: string;
}

export interface UserWithUpcomingAssessments {
  userId: string;
  email: string;
  name: string;
  assessments: NotificationAssessmentItem[];
}

export async function getUsersWithUpcomingAssessments(
  todayIso: string,
): Promise<UserWithUpcomingAssessments[]> {
  const rows = await getDb()
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      assessmentType: assessment.type,
      assessmentDueDate: assessment.dueDate,
      subjectName: subject.name,
    })
    .from(user)
    .innerJoin(assessment, eq(assessment.userId, user.id))
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .leftJoin(
      notificationLog,
      and(
        eq(notificationLog.assessmentId, assessment.id),
        eq(notificationLog.userId, user.id),
        eq(notificationLog.notificationDate, todayIso),
      ),
    )
    .where(
      and(
        eq(user.accessStatus, "approved"),
        eq(user.notificationsEnabled, true),
        eq(assessment.status, "pending"),
        isNotNull(assessment.dueDate),
        isNull(subject.archivedAt),
        gte(assessment.dueDate, todayIso),
        sql`${assessment.dueDate} <= (${todayIso}::date + ${user.notificationDaysBefore} * interval '1 day')::date`,
        or(isNull(notificationLog.id), eq(notificationLog.status, "failed")),
      ),
    );

  const userMap = new Map<string, UserWithUpcomingAssessments>();

  for (const row of rows) {
    if (!row.assessmentDueDate) continue;

    const existing = userMap.get(row.userId);
    const item: NotificationAssessmentItem = {
      id: row.assessmentId,
      title: row.assessmentTitle,
      type: row.assessmentType,
      dueDate: row.assessmentDueDate,
      subjectName: row.subjectName,
    };

    if (existing) {
      existing.assessments.push(item);
    } else {
      userMap.set(row.userId, {
        userId: row.userId,
        email: row.email,
        name: row.name,
        assessments: [item],
      });
    }
  }

  return Array.from(userMap.values());
}
