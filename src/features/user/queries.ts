import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";
import { type AppTheme, isAppTheme } from "@/lib/theme";

export async function getUserPreferredTheme(userId: string): Promise<AppTheme> {
  const [result] = await getDb()
    .select({ preferredTheme: user.preferredTheme })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return isAppTheme(result?.preferredTheme) ? result.preferredTheme : "system";
}

export async function getNotificationPreferences(userId: string): Promise<{
  notificationsEnabled: boolean;
  notificationDaysBefore: number;
}> {
  const [result] = await getDb()
    .select({
      notificationsEnabled: user.notificationsEnabled,
      notificationDaysBefore: user.notificationDaysBefore,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    notificationsEnabled: result?.notificationsEnabled ?? false,
    notificationDaysBefore: result?.notificationDaysBefore ?? 1,
  };
}
