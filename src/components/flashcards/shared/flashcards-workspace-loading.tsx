import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface FlashcardsWorkspaceLoadingProps {
  children: ReactNode;
}

const deckRows = [
  "deck-row-1",
  "deck-row-2",
  "deck-row-3",
  "deck-row-4",
  "deck-row-5",
  "deck-row-6",
];

export function FlashcardsWorkspaceLoading({
  children,
}: Readonly<FlashcardsWorkspaceLoadingProps>) {
  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-border/70 bg-card/85 p-3 shadow-none lg:sticky lg:top-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-4 flex-1 rounded-md" />
            <Skeleton className="size-7 rounded-md" />
          </div>
          {deckRows.map((row, index) => (
            <div
              key={row}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              style={{ paddingLeft: `${12 + index * 4}px` }}
            >
              <Skeleton className="size-7 rounded-md" />
              <Skeleton
                className={`h-4 rounded-md ${index % 3 === 0 ? "w-32" : index % 3 === 1 ? "w-24" : "w-28"}`}
              />
              <Skeleton className="ml-auto size-7 rounded-md" />
            </div>
          ))}
        </div>
      </aside>
      <div className="min-w-0 lg:min-h-0">{children}</div>
    </div>
  );
}
