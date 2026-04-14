"use server";

import { updateUserTheme as updateUserThemeForUser } from "@/features/user/mutations";
import type { UpdateUserThemeForm } from "@/features/user/validation";
import { updateUserThemeSchema } from "@/features/user/validation";
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
