import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBarSkeleton } from "@/components/shared/page-top-bar";
import { Skeleton } from "@/components/ui/skeleton";

interface PlanningLoadingShellProps {
  children: ReactNode;
}

export function PlanningLoadingShell({
  children,
}: Readonly<PlanningLoadingShellProps>) {
  return (
    <>
      <PageTopBarSkeleton />
      <main className="lg:h-[calc(100svh-3.5rem)] lg:overflow-hidden">
        <AppPageContainer className="flex flex-col lg:h-full lg:min-h-0">
          <div className="mb-4 flex h-9 w-fit items-center gap-1.5 rounded-lg border border-border/60 px-0.75">
            <Skeleton className="h-7 w-32 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>

          <div className="lg:min-h-0 lg:flex-1">{children}</div>
        </AppPageContainer>
      </main>
    </>
  );
}
