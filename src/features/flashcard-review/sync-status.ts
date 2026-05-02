import type { FlashcardReviewSyncStatus } from "@/features/flashcard-review/offline-store";
import type { SyncIndicatorStatus } from "@/lib/sync-status";

interface FlashcardReviewSyncIndicatorStatusInput {
  syncStatus: FlashcardReviewSyncStatus;
  pendingSyncCount: number;
  isOnline: boolean;
}

/**
 * Maps flashcard review sync state to the shared visual sync indicator state.
 *
 * @example
 * getFlashcardReviewSyncIndicatorStatus({
 *   syncStatus: "idle",
 *   pendingSyncCount: 0,
 *   isOnline: true,
 * });
 */
export function getFlashcardReviewSyncIndicatorStatus({
  syncStatus,
  pendingSyncCount,
  isOnline,
}: Readonly<FlashcardReviewSyncIndicatorStatusInput>): SyncIndicatorStatus {
  if (syncStatus === "error") {
    return "error";
  }

  if (pendingSyncCount > 0) {
    return "pending";
  }

  if (syncStatus === "syncing") {
    return "syncing";
  }

  if (!isOnline || syncStatus === "offline") {
    return "offline";
  }

  return "ready";
}
