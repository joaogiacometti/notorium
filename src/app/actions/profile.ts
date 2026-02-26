"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import type { MutationResult } from "@/lib/api/contracts";
import { auth } from "@/lib/auth";
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
