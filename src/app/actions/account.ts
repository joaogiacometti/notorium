"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import {
  deleteAccountForUser,
  updateUserAccessStatusForUser,
} from "@/features/account/mutations";
import {
  createUserAiSettingsSchema,
  type UpdateAccountForm,
  type UpdateUserAiSettingsForm,
  updateAccountSchema,
  updateUserAiSettingsSchema,
} from "@/features/account/validation";
import {
  clearUserAiSettings as clearUserAiSettingsForUser,
  updateUserAiSettings as updateUserAiSettingsForUser,
} from "@/features/ai/settings";
import { isAdminUser } from "@/lib/auth/access-control";
import { auth, getAuthenticatedUserId } from "@/lib/auth/auth";
import {
  runValidatedAction,
  runValidatedUserAction,
} from "@/lib/server/action-runner";
import type {
  MutationResult,
  UserAiSettingsSummary,
} from "@/lib/server/api-contracts";
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
        await auth.api.updateUser({
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

export async function updateUserAiSettings(
  data: UpdateUserAiSettingsForm,
): Promise<MutationResult & { settings?: UserAiSettingsSummary }> {
  return runValidatedUserAction(
    updateUserAiSettingsSchema,
    data,
    "account.ai.invalidData",
    async (userId, parsedData) => {
      try {
        const settings = await updateUserAiSettingsForUser(userId, parsedData);
        if (settings) {
          return {
            success: true,
            settings,
          };
        }

        return runValidatedAction(
          createUserAiSettingsSchema,
          parsedData,
          "account.ai.invalidData",
          async (createdData) => {
            const savedSettings = await updateUserAiSettingsForUser(
              userId,
              createdData,
            );
            if (!savedSettings) {
              return actionError("account.ai.updateFailed");
            }

            return {
              success: true,
              settings: savedSettings,
            };
          },
        );
      } catch {
        return actionError("account.ai.updateFailed");
      }
    },
  );
}

export async function clearUserAiSettings(): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();

  try {
    await clearUserAiSettingsForUser(userId);
  } catch {
    return actionError("account.ai.clearFailed");
  }

  return { success: true };
}

export async function deleteAccount(): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();
  const result = await deleteAccountForUser(userId);

  if (!result.success) {
    return result;
  }

  await auth.api.signOut({
    headers: await headers(),
  });

  const locale = await getLocale();
  redirect(`/${locale}/login`);
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
    "common.invalidRequest",
    async (parsedData) => {
      if (parsedData.userId === adminUserId) {
        return actionError("auth.forbidden");
      }

      return updateUserAccessStatusForUser(parsedData);
    },
  );
}
