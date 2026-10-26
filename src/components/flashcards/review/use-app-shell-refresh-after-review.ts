"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Refreshes the server-rendered app shell (sidebar due-card badges) when a
 * review session page unmounts after any review write. Grade and undo actions
 * skip `revalidateAppShell` because Server Actions run one at a time per
 * client: re-rendering the layout and page after every grade would queue each
 * save and the undo behind ~10 queries, and a mid-session refresh would
 * redirect the session page away when the last due card is graded. The sidebar
 * is hidden on session pages, so syncing once on the way out (exit, browser
 * back, or navigation) is enough.
 *
 * @example
 * useAppShellRefreshAfterReview(pendingSaveCount);
 */
export function useAppShellRefreshAfterReview(
  pendingReviewWriteCount: number,
): void {
  const router = useRouter();
  const hasStaleShellRef = useRef(false);

  useEffect(() => {
    if (pendingReviewWriteCount > 0) {
      hasStaleShellRef.current = true;
    }
  }, [pendingReviewWriteCount]);

  useEffect(() => {
    const staleShellRef = hasStaleShellRef;
    return () => {
      if (staleShellRef.current) {
        router.refresh();
      }
    };
  }, [router]);
}
