import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { user } from "@/db/schema";
import type { UpdateNotificationPreferencesForm } from "@/features/notifications/validation";
import { isAdminUser } from "@/lib/auth/access-control";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";
import type { AppTheme } from "@/lib/theme";
import type { UpdateUserAccessInput } from "@/lib/validations/access-control";

export type UserMutationResult = { success: true } | ActionErrorResult;

export async function updateUserTheme(
  userId: string,
  theme: AppTheme,
): Promise<void> {
  await getDb()
    .update(user)
    .set({ preferredTheme: theme })
    .where(eq(user.id, userId));
}

export async function updateUserAccessStatusForUser(
  adminUserId: string,
  data: UpdateUserAccessInput,
): Promise<UserMutationResult> {
  const isAdmin = await isAdminUser(adminUserId);
  if (!isAdmin) {
    return actionError("auth.unauthorized");
  }

  const [targetUser] = await getDb()
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.id, data.userId))
    .limit(1);

  if (!targetUser) {
    return actionError("auth.userNotFound");
  }

  await getDb()
    .update(user)
    .set({
      accessStatus: data.accessStatus,
    })
    .where(eq(user.id, data.userId));

  return { success: true };
}

export async function updateNotificationPreferences(
  userId: string,
  data: UpdateNotificationPreferencesForm,
): Promise<UserMutationResult> {
  await getDb()
    .update(user)
    .set({
      notificationsEnabled: data.notificationsEnabled,
      notificationDaysBefore: Number(data.notificationDaysBefore),
    })
    .where(eq(user.id, userId));

  return { success: true };
}
