import { headers } from "next/headers";
import { purgeUserBlobs } from "@/features/attachments/blob-gc";
import { getAuth } from "@/lib/auth/auth";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type AccountMutationResult = { success: true } | ActionErrorResult;

export async function deleteAccountForUser(
  userId: string,
): Promise<AccountMutationResult> {
  try {
    const requestHeaders = await headers();
    await getAuth().api.deleteUser({
      headers: requestHeaders,
      body: {
        callbackURL: "/login",
      },
    });
  } catch {
    return actionError("account.deleteFailed");
  }

  // Best-effort: blob removal must not fail account deletion. The orphan sweep
  // is the backstop for anything left behind here.
  await purgeUserBlobs(userId);

  return { success: true };
}
