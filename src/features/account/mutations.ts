import { headers } from "next/headers";
import {
  cleanupAttachmentPathnames,
  listAccountAttachmentPathnames,
} from "@/features/attachments/cleanup";
import { getAuth, getAuthenticatedUserId } from "@/lib/auth/auth";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type AccountMutationResult = { success: true } | ActionErrorResult;

export async function deleteAccountForUser(): Promise<AccountMutationResult> {
  const userId = await getAuthenticatedUserId();
  const provider = await getMediaStorageProvider();
  let attachmentPathnames: string[] = [];

  if (provider) {
    try {
      attachmentPathnames = await listAccountAttachmentPathnames(
        provider,
        userId,
      );
    } catch {}
  }

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

  await cleanupAttachmentPathnames(userId, attachmentPathnames);

  return { success: true };
}
