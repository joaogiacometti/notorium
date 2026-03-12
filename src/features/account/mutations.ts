import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { user } from "@/db/schema";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";
import type { UpdateUserAccessInput } from "@/lib/validations/access-control";

export type AccountMutationResult = { success: true } | ActionErrorResult;

export async function deleteAccountForUser(
  userId: string,
): Promise<AccountMutationResult> {
  await db.delete(user).where(eq(user.id, userId));
  return { success: true };
}

export async function updateUserAccessStatusForUser(
  data: UpdateUserAccessInput,
): Promise<AccountMutationResult> {
  const [targetUser] = await db
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.id, data.userId))
    .limit(1);

  if (!targetUser) {
    return actionError("auth.userNotFound");
  }

  await db
    .update(user)
    .set({
      accessStatus: data.accessStatus,
    })
    .where(eq(user.id, data.userId));

  return { success: true };
}
