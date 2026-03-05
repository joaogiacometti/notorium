"use server";

import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@/db/index";
import { user } from "@/db/schema";
import type { MutationResult } from "@/lib/api/contracts";
import { auth, getAuthenticatedUserId } from "@/lib/auth";
import { actionError } from "@/lib/server-action-errors";
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
