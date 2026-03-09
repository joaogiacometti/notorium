"use server";

import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@/db/index";
import { user } from "@/db/schema";
import {
  clearUserAiSettings as clearUserAiSettingsForUser,
  updateUserAiSettings as updateUserAiSettingsForUser,
} from "@/features/ai/settings";
import {
  createUserAiSettingsSchema,
  type UpdateProfileForm,
  type UpdateUserAiSettingsForm,
  updateProfileSchema,
  updateUserAiSettingsSchema,
} from "@/features/profile/validation";
import { isAdminUser } from "@/lib/auth/access-control";
import { auth, getAuthenticatedUserId } from "@/lib/auth/auth";
import { parseActionInput } from "@/lib/server/action-input";
import type {
  MutationResult,
  UserAiSettingsSummary,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";
import {
  type UpdateUserAccessInput,
  updateUserAccessSchema,
} from "@/lib/validations/access-control";

export async function updateProfile(
  data: UpdateProfileForm,
): Promise<MutationResult> {
  const parsed = parseActionInput(
    updateProfileSchema,
    data,
    "profile.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: parsed.data.name,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return actionError("profile.updateFailed", {
        errorMessage: error.message,
      });
    }
    return actionError("profile.updateFailed");
  }

  return { success: true };
}

export async function updateUserAiSettings(
  data: UpdateUserAiSettingsForm,
): Promise<MutationResult & { settings?: UserAiSettingsSummary }> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    updateUserAiSettingsSchema,
    data,
    "profile.ai.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  try {
    const settings = await updateUserAiSettingsForUser(userId, parsed.data);

    if (!settings) {
      const created = createUserAiSettingsSchema.safeParse(data);

      if (!created.success) {
        return actionError("profile.ai.invalidData");
      }

      const savedSettings = await updateUserAiSettingsForUser(
        userId,
        created.data,
      );

      if (!savedSettings) {
        return actionError("profile.ai.updateFailed");
      }

      return {
        success: true,
        settings: savedSettings,
      };
    }

    return {
      success: true,
      settings,
    };
  } catch {
    return actionError("profile.ai.updateFailed");
  }
}

export async function clearUserAiSettings(): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();

  try {
    await clearUserAiSettingsForUser(userId);
  } catch {
    return actionError("profile.ai.clearFailed");
  }

  return { success: true };
}

export async function deleteAccount(): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();

  await db.delete(user).where(eq(user.id, userId));

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

  const parsed = parseActionInput(
    updateUserAccessSchema,
    data,
    "common.invalidRequest",
  );
  if (!parsed.success) {
    return parsed.error;
  }

  if (parsed.data.userId === adminUserId) {
    return actionError("auth.forbidden");
  }

  const [targetUser] = await db
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.id, parsed.data.userId))
    .limit(1);

  if (!targetUser) {
    return actionError("auth.userNotFound");
  }

  await db
    .update(user)
    .set({
      accessStatus: parsed.data.accessStatus,
    })
    .where(eq(user.id, parsed.data.userId));

  return { success: true };
}
