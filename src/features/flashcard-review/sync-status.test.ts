import { describe, expect, it } from "vitest";
import { getFlashcardReviewSyncIndicatorStatus } from "@/features/flashcard-review/sync-status";

describe("getFlashcardReviewSyncIndicatorStatus", () => {
  it.each([
    ["error", { syncStatus: "error", pendingSyncCount: 2, isOnline: false }],
    ["pending", { syncStatus: "syncing", pendingSyncCount: 2, isOnline: true }],
    ["syncing", { syncStatus: "syncing", pendingSyncCount: 0, isOnline: true }],
    ["offline", { syncStatus: "idle", pendingSyncCount: 0, isOnline: false }],
    ["offline", { syncStatus: "offline", pendingSyncCount: 0, isOnline: true }],
    ["ready", { syncStatus: "idle", pendingSyncCount: 0, isOnline: true }],
  ] as const)("returns %s", (expectedStatus, input) => {
    expect(getFlashcardReviewSyncIndicatorStatus(input)).toBe(expectedStatus);
  });
});
