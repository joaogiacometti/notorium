"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { invalidateFlashcardViews } from "@/lib/client-cache/invalidation";

/**
 * Refreshes the server-rendered app shell (sidebar due-card badges) when a
 * review session page unmounts after any review write. Grade and undo actions
 * skip `revalidateAppShell` because Server Actions run one at a time per
 * client: re-rendering the layout and page after every grade would queue each
 * save and the undo behind ~10 queries, and a mid-session refresh would
 * redirect the session page away when the last due card is graded. The sidebar
 * is hidden on session pages. Client flashcard caches also expire here, so
 * syncing once on the way out (exit, browser back, or navigation) is enough.
 *
 * @example
 * useAppShellRefreshAfterReview(pendingSaveCount);
 */
export function useAppShellRefreshAfterReview(
  pendingReviewWriteCount: number,
): void {
  const router = useRouter();
  const queryClient = useQueryClient();
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
        void invalidateFlashcardViews(queryClient);
        router.refresh();
      }
    };
  }, [router, queryClient]);
}
