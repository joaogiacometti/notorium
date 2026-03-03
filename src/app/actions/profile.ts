"use server";

import { del } from "@vercel/blob";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@/db/index";
import { noteImageAttachment, user } from "@/db/schema";
import { appEnv } from "@/env";
import type { MutationResult } from "@/lib/api/contracts";
import { auth, getAuthenticatedUserId } from "@/lib/auth";
import {
  type UpdateProfileForm,
  updateProfileSchema,
} from "@/lib/validations/profile";

export async function updateProfile(
  data: UpdateProfileForm,
): Promise<MutationResult> {
  const parsed = updateProfileSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid profile data.",
    };
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
      return { error: error.message };
    }
    return { error: "Failed to update profile." };
  }

  return { success: true };
}

export async function deleteAccount(): Promise<MutationResult> {
  const userId = await getAuthenticatedUserId();

  const attachments = await db
    .select({ blobPathname: noteImageAttachment.blobPathname })
    .from(noteImageAttachment)
    .where(eq(noteImageAttachment.userId, userId));

  await db.delete(user).where(eq(user.id, userId));

  if (appEnv.BLOB_READ_WRITE_TOKEN && attachments.length > 0) {
    try {
      await del(
        attachments.map((a) => a.blobPathname),
        { token: appEnv.BLOB_READ_WRITE_TOKEN },
      );
    } catch {}
  }

  await auth.api.signOut({
    headers: await headers(),
  });

  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
