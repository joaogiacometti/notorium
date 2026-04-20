import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";

interface PlanningLoadingShellProps {
  children: ReactNode;
}

export function PlanningLoadingShell({
  children,
}: Readonly<PlanningLoadingShellProps>) {
  return (
    <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
      <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
        <div className="mb-6 flex min-w-0 items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-full max-w-72" />
          </div>
        </div>

        <div className="mb-4 flex h-9 w-fit items-center gap-1.5 rounded-lg border border-border/60 px-0.75">
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>

        <div className="lg:flex-1 lg:min-h-0">{children}</div>
      </AppPageContainer>
    </main>
  );
}
