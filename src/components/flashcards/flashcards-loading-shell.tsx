import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

interface FlashcardsLoadingShellProps {
  children: ReactNode;
}

export function FlashcardsLoadingShell({
  children,
}: Readonly<FlashcardsLoadingShellProps>) {
  return (
    <main data-testid="flashcards-loading-shell">
      <AppPageContainer>
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
        </div>

        <div className="mb-6 flex h-10 w-fit items-center gap-2 rounded-md border border-border/60 px-1">
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-24 rounded-sm" />
        </div>

        {children}
      </AppPageContainer>
    </main>
  );
}
