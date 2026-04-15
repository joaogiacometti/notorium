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
    <main
      className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden"
      data-testid="flashcards-loading-shell"
    >
      <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            <Skeleton className="mt-2 h-4 w-36" />
          </div>
        </div>

        <div className="mb-4 flex h-10 w-fit items-center gap-2 rounded-md border border-border/60 px-1">
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-28 rounded-sm" />
        </div>

        <div className="lg:flex-1 lg:min-h-0">{children}</div>
      </AppPageContainer>
    </main>
  );
}
