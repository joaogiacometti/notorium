import { cleanupAttachmentPathnames } from "@/features/attachments/cleanup";
import { getRemovedAttachmentPathnames } from "@/features/attachments/utils";

export async function cleanupAttachmentsAfterMutation(
  userId: string,
  existingValues: string[],
  newValues: string[],
): Promise<void> {
  const removed = getRemovedAttachmentPathnames(existingValues, newValues);
  await cleanupAttachmentPathnames(userId, removed);
}
