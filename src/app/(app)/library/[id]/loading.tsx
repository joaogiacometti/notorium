import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryBookLoading() {
  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border/70 bg-background px-4 py-2.5">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="ml-auto h-4 w-24" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-56 shrink-0 flex-col gap-3 border-r border-border/70 bg-background p-2 md:flex">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded" />
          <Skeleton className="h-24 w-full rounded" />
        </div>
        <div className="flex flex-1 items-start justify-center bg-muted/40 px-4 py-6">
          <Skeleton className="h-[80vh] w-full max-w-3xl rounded-lg" />
        </div>
      </div>
    </div>
  );
}
