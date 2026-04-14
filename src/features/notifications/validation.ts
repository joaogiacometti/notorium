import { z } from "zod";

export const notificationDaysBeforeValues = ["1", "3", "7"] as const;
export type NotificationDaysBefore =
  (typeof notificationDaysBeforeValues)[number];

export const updateNotificationPreferencesSchema = z.object({
  notificationsEnabled: z.boolean(),
  notificationDaysBefore: z.enum(notificationDaysBeforeValues),
});

export type UpdateNotificationPreferencesForm = z.infer<
  typeof updateNotificationPreferencesSchema
>;
