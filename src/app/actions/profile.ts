"use server";

import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@/db/index";
import { user } from "@/db/schema";
import { isAdminUser } from "@/lib/access-control";
import type { MutationResult } from "@/lib/api/contracts";
import { auth, getAuthenticatedUserId } from "@/lib/auth";
import { actionError } from "@/lib/server-action-errors";
import {
  type UpdateUserAccessInput,
  updateUserAccessSchema,
} from "@/lib/validations/access-control";
import {
  type UpdateProfileForm,
  updateProfileSchema,
} from "@/lib/validations/profile";

export async function updateProfile(
  data: UpdateProfileForm,
): Promise<MutationResult> {
  const parsed = updateProfileSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("profile.invalidData");
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

  const parsed = updateUserAccessSchema.safeParse(data);
  if (!parsed.success) {
    return actionError("common.invalidRequest");
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
