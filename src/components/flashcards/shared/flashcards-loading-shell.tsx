import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface FlashcardsLoadingShellProps {
  children: ReactNode;
}

/**
 * Body skeleton for the flashcards hub. Mirrors `FlashcardsPageClient`: the
 * subject scope-filter row above the active view's content. The page top bar
 * and view switch come from the route `loading.tsx` shell, so this renders only
 * the inner body — there is no in-page tree/side menu anymore.
 */
export function FlashcardsLoadingShell({
  children,
}: Readonly<FlashcardsLoadingShellProps>) {
  return (
    <div
      className="flex min-w-0 flex-col gap-4 lg:h-full lg:min-h-0"
      data-testid="flashcards-loading-shell"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12 rounded-md" />
        <Skeleton className="h-9 w-full max-w-xs rounded-md" />
      </div>
      {children}
    </div>
  );
}
