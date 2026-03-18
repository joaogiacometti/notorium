"use server";

import { updateUserTheme as updateUserThemeForUser } from "@/features/user/mutations";
import { getUserPreferredTheme } from "@/features/user/queries";
import type { UpdateUserThemeForm } from "@/features/user/validation";
import { updateUserThemeSchema } from "@/features/user/validation";
import { getOptionalSession } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type { MutationResult } from "@/lib/server/api-contracts";

export async function updateUserTheme(
  data: UpdateUserThemeForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    updateUserThemeSchema,
    data,
    "theme.invalidData",
    async (userId, parsedData) => {
      await updateUserThemeForUser(userId, parsedData.theme);
      return { success: true };
    },
  );
}

export async function getUserThemeServerSide(): Promise<string> {
  const session = await getOptionalSession();
  if (!session) {
    return "system";
  }
  const theme = await getUserPreferredTheme(session.user.id);
  return theme;
}
