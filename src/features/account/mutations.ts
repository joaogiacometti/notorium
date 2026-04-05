import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/auth";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type AccountMutationResult = { success: true } | ActionErrorResult;

export async function deleteAccountForUser(): Promise<AccountMutationResult> {
  try {
    const requestHeaders = await headers();
    await getAuth().api.signOut({ headers: requestHeaders });
    await getAuth().api.deleteUser({
      headers: requestHeaders,
      body: {
        callbackURL: "/login",
      },
    });
  } catch {
    return actionError("account.deleteFailed");
  }

  return { success: true };
}
