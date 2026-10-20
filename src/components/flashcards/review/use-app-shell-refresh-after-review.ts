"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef } from "react";

/**
 * Refreshes the server-rendered app shell (sidebar due-card badges) once a
 * review burst settles. Grade and undo actions skip `revalidateAppShell`
 * because Server Actions run one at a time per client: re-rendering the layout
 * and page after every grade would queue each save and the undo behind ~10
 * queries. The sidebar is hidden in focus mode, so syncing once all review
 * writes have landed and focus mode is closed (or the page unmounts) is enough.
 * `onReviewSettled` runs at the same moment so client-held review counts are
 * re-read alongside the refreshed sidebar and the two cannot drift apart.
 *
 * @example
 * useAppShellRefreshAfterReview(isFocusMode, pendingSaveCount, resyncReviewState);
 */
export function useAppShellRefreshAfterReview(
  isFocusMode: boolean,
  pendingReviewWriteCount: number,
  onReviewSettled: () => void,
): void {
  const router = useRouter();
  const hasStaleShellRef = useRef(false);
  const notifyReviewSettled = useEffectEvent(onReviewSettled);

  useEffect(() => {
    if (pendingReviewWriteCount > 0) {
      hasStaleShellRef.current = true;
      return;
    }
    if (isFocusMode || !hasStaleShellRef.current) {
      return;
    }

    hasStaleShellRef.current = false;
    router.refresh();
    notifyReviewSettled();
  }, [isFocusMode, pendingReviewWriteCount, router]);

  // Leaving the page mid-session (e.g. browser back from focus mode) keeps the
  // shared layout mounted, so sync it on the way out too.
  useEffect(() => {
    const staleShellRef = hasStaleShellRef;
    return () => {
      if (staleShellRef.current) {
        router.refresh();
      }
    };
  }, [router]);
}
