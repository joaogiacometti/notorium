import { Skeleton } from "@/components/ui/skeleton";

interface BookReaderLoadingFrameProps {
  message?: string;
}

/**
 * Stable book reader placeholder used before the client-only PDF engine mounts.
 *
 * @example
 * <BookReaderLoadingFrame message="Loading book..." />
 */
export function BookReaderLoadingFrame({
  message = "Loading book...",
}: Readonly<BookReaderLoadingFrameProps>) {
  return (
    <div className="flex h-svh flex-col bg-background">
      <ReaderLoadingToolbar />
      <div className="flex min-h-0 min-w-0 flex-1">
        <ReaderLoadingSidebar />
        <ReaderLoadingCanvas message={message} />
      </div>
    </div>
  );
}

function ReaderLoadingToolbar() {
  return (
    <header className="relative flex h-12 shrink-0 items-center gap-1 border-b border-border/70 bg-background px-3 py-2">
      <Skeleton className="hidden h-4 w-36 lg:block xl:w-52" />
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        <Skeleton className="h-7 w-10 rounded" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="ml-auto size-8 rounded-md" />
    </header>
  );
}

function ReaderLoadingSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border/70 bg-background md:flex">
      <div className="shrink-0 p-2">
        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 p-0.75">
          <Skeleton className="h-7 flex-1 rounded-md" />
          <Skeleton className="h-7 flex-1 rounded-md" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-2 pt-0">
        <Skeleton className="h-28 w-full rounded" />
        <Skeleton className="h-28 w-full rounded" />
        <Skeleton className="h-28 w-full rounded" />
      </div>
    </aside>
  );
}

function ReaderLoadingCanvas({ message }: Readonly<{ message: string }>) {
  return (
    <main className="relative min-w-0 flex-1 overflow-hidden bg-muted/40">
      <ReaderLoadingSidebarToggle />
      <ReaderLoadingTools />
      <div className="flex h-full items-start justify-center px-4 py-6">
        <div className="flex w-full max-w-3xl flex-col items-center gap-3">
          <ReaderLoadingPage />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </main>
  );
}

function ReaderLoadingSidebarToggle() {
  return (
    <div className="absolute left-0 top-1/2 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border/70 bg-background/95 text-muted-foreground shadow-sm md:flex">
      <Skeleton className="h-3 w-2 rounded-sm" />
    </div>
  );
}

function ReaderLoadingTools() {
  return (
    <div className="absolute left-3 top-3 z-10 hidden flex-col gap-0.5 rounded-md border border-border/70 bg-background/95 p-0.5 shadow-sm md:flex">
      <ReaderLoadingToolSkeleton active />
      <ReaderLoadingToolSkeleton />
      <ReaderLoadingToolSkeleton />
    </div>
  );
}

function ReaderLoadingToolSkeleton({
  active = false,
}: Readonly<{ active?: boolean }>) {
  return (
    <div className="flex size-8 items-center justify-center rounded-md">
      <Skeleton
        className={
          active ? "size-5 rounded-sm opacity-80" : "size-4 rounded-sm"
        }
      />
    </div>
  );
}

function ReaderLoadingPage() {
  return (
    <div className="flex h-[min(74svh,56rem)] w-full justify-center">
      <div className="aspect-[1/1.414] h-full max-w-full rounded-sm border border-border/70 bg-background p-[7%] shadow-sm">
        <ReaderLoadingPageHeader />
        <ReaderLoadingPageFigures />
        <ReaderLoadingPageBody />
      </div>
    </div>
  );
}

function ReaderLoadingPageHeader() {
  return (
    <div className="space-y-[4%]">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

function ReaderLoadingPageFigures() {
  return (
    <div className="mt-[10%] grid grid-cols-2 gap-[5%]">
      <Skeleton className="h-20 rounded-sm" />
      <Skeleton className="h-20 rounded-sm" />
    </div>
  );
}

function ReaderLoadingPageBody() {
  return (
    <div className="mt-[8%] space-y-[4%]">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-10/12" />
    </div>
  );
}
