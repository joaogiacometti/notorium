import type { ReactNode } from "react";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FlashcardsLoadingShellProps {
  children: ReactNode;
  mobileScopeFirst?: boolean;
  withWorkspace?: boolean;
}

const deckRows = [
  { id: "deck-row-1", depth: 0, widthClassName: "w-28" },
  { id: "deck-row-2", depth: 1, widthClassName: "w-24" },
  { id: "deck-row-3", depth: 0, widthClassName: "w-32" },
  { id: "deck-row-4", depth: 1, widthClassName: "w-28" },
  { id: "deck-row-5", depth: 2, widthClassName: "w-24" },
];

export function FlashcardsLoadingShell({
  children,
  mobileScopeFirst = false,
  withWorkspace = false,
}: Readonly<FlashcardsLoadingShellProps>) {
  const content = withWorkspace ? (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
      {mobileScopeFirst ? (
        <div className="rounded-xl border border-border/70 bg-card/85 p-3 shadow-xs lg:hidden">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="mt-2 h-10 w-full rounded-lg" />
        </div>
      ) : null}
      <aside
        className={cn(
          "rounded-2xl border border-border/70 bg-card/85 p-3 shadow-none lg:sticky lg:top-0 lg:h-full lg:min-h-0 lg:overflow-y-auto",
          mobileScopeFirst ? "hidden lg:block" : undefined,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>

        <div className="relative mt-3">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="ml-auto h-5 w-8 rounded-full" />
          </div>

          <div className="mt-3 border-t border-border/60 pt-3">
            <Skeleton className="mx-2 h-3 w-20 rounded-md" />
          </div>

          {deckRows.map((row) => (
            <div
              key={row.id}
              className="flex h-9 items-center gap-2 rounded-lg px-2"
            >
              <span
                className="shrink-0"
                style={{ width: `${row.depth * 16}px` }}
              />
              <Skeleton className={`h-5 rounded-md ${row.widthClassName}`} />
              <Skeleton className="ml-auto h-5 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </aside>
      <div className="min-w-0 lg:min-h-0">{children}</div>
    </div>
  ) : (
    children
  );

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
          </div>
        </div>

        <div className="mb-4 flex h-10 w-fit items-center gap-2 rounded-md border border-border/60 px-1">
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-28 rounded-sm" />
        </div>

        <div className="lg:flex-1 lg:min-h-0">{content}</div>
      </AppPageContainer>
    </main>
  );
}
