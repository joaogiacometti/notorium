import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionLoadingFrameProps {
  badge: ReactNode;
}

/** Review page skeleton: the header's badge slot stays empty, as in the session. */
export function ReviewSessionLoading() {
  return <SessionLoadingFrame badge={<div className="size-10" />} />;
}

/** Exam page skeleton: includes the exam badge placeholder in the header. */
export function ExamSessionLoading() {
  return (
    <SessionLoadingFrame badge={<Skeleton className="h-7 w-16 rounded-md" />} />
  );
}

/**
 * Mirrors `ReviewSessionShell`: progress bar, header row, centered card,
 * footer button.
 */
function SessionLoadingFrame({ badge }: Readonly<SessionLoadingFrameProps>) {
  return (
    <div
      className="flex h-svh flex-col overflow-hidden bg-background"
      data-testid="review-session-loading"
    >
      <Skeleton className="h-1.5 w-full rounded-none" />
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 sm:px-5">
        {badge}
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-1">
          <Skeleton className="size-10" />
          <Skeleton className="size-10" />
        </div>
      </div>
      <div className="min-h-0 flex-1 px-4 sm:px-5">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center gap-4 py-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-3 sm:px-5 sm:py-4">
        <Skeleton className="mx-auto h-12 w-full max-w-4xl rounded-lg sm:h-14" />
      </div>
    </div>
  );
}
