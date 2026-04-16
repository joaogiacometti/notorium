"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { deleteAccountForUser } from "@/features/account/mutations";
import {
  type UpdateAccountForm,
  updateAccountSchema,
} from "@/features/account/validation";
import {
  type UpdateNotificationPreferencesForm,
  updateNotificationPreferencesSchema,
} from "@/features/notifications/validation";
import {
  updateNotificationPreferences as updateNotificationPreferencesForUser,
  updateUserAccessStatusForUser,
} from "@/features/user/mutations";
import { isAdminUser } from "@/lib/auth/access-control";
import { getAuth, getAuthenticatedUserId } from "@/lib/auth/auth";
import {
  runValidatedAction,
  runValidatedUserAction,
} from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";
import {
  type UpdateUserAccessInput,
  updateUserAccessSchema,
} from "@/lib/validations/access-control";

export async function updateAccount(
  data: UpdateAccountForm,
): Promise<MutationResult> {
  return runValidatedAction(
    updateAccountSchema,
    data,
    "account.invalidData",
    async (parsedData) => {
      try {
        await getAuth().api.updateUser({
          headers: await headers(),
          body: {
            name: parsedData.name,
          },
        });
      } catch (error) {
        if (error instanceof APIError) {
          return actionError("account.updateFailed");
        }
        return actionError("account.updateFailed");
      }

      return { success: true };
    },
  );
}

export async function updateNotificationPreferences(
  data: UpdateNotificationPreferencesForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    updateNotificationPreferencesSchema,
    data,
    "account.notifications.invalidData",
    async (userId, parsedData) => {
      try {
        return await updateNotificationPreferencesForUser(userId, parsedData);
      } catch {
        return actionError("account.notifications.updateFailed");
      }
    },
  );
}

export async function deleteAccount(): Promise<MutationResult> {
  const result = await deleteAccountForUser();

  if (!result.success) {
    return result;
  }

  return { success: true };
}

async function getAdminUserId() {
  const userId = await getAuthenticatedUserId();
  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) {
    return null;
  }

  return userId;
}

export async function updateUserAccessStatus(
  data: UpdateUserAccessInput,
): Promise<MutationResult> {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return actionError("auth.forbidden");
  }

  return runValidatedAction(
    updateUserAccessSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (parsedData) => {
      if (parsedData.userId === adminUserId) {
        return actionError("auth.forbidden");
      }

      return updateUserAccessStatusForUser(adminUserId, parsedData);
    },
  );
}
