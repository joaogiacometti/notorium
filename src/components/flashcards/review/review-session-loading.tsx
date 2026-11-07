import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionLoadingFrameProps {
  badge?: ReactNode;
}

/** Review page skeleton: the review header has no badge. */
export function ReviewSessionLoading() {
  return <SessionLoadingFrame />;
}

/** Exam page skeleton: includes the exam badge placeholder in the header. */
export function ExamSessionLoading() {
  return (
    <SessionLoadingFrame badge={<Skeleton className="h-6.5 w-16 shrink-0" />} />
  );
}

/**
 * Mirrors `ReviewSessionShell` with an unrevealed card: header (assistant,
 * actions, exit), progress bar, subject label over the Front face, and the
 * Show answer footer.
 */
function SessionLoadingFrame({ badge }: Readonly<SessionLoadingFrameProps>) {
  return (
    <div
      className="flex h-svh flex-col overflow-hidden bg-background"
      data-testid="review-session-loading"
    >
      <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
        {badge}
        <div className="flex h-5 min-w-0 flex-1 items-center">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
        </div>
      </div>
      <div className="h-0.5 w-full shrink-0 bg-border" />
      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center py-4 sm:py-6">
          <div className="mb-3 flex h-4 items-center">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:p-6">
            <div className="flex h-4 items-center">
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-7 w-3/4" />
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t px-4 py-3 sm:px-6 sm:py-4">
        <Skeleton className="mx-auto h-12 w-full max-w-4xl sm:h-14" />
      </div>
    </div>
  );
}
