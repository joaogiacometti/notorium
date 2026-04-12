import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <main className="flex flex-col">
      <section className="flex flex-col items-center gap-6 px-4 pt-8 pb-16 text-center sm:px-6 sm:pb-20 lg:px-8">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <div className="w-full max-w-3xl space-y-3">
          <Skeleton className="mx-auto h-12 w-full max-w-2xl rounded-xl sm:h-14 lg:h-18" />
          <Skeleton className="mx-auto h-6 w-full max-w-xl rounded-md" />
          <Skeleton className="mx-auto h-6 w-full max-w-lg rounded-md" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="mx-auto mb-12 h-10 w-80 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(
              { length: 5 },
              (_, index) => `feature-${index + 1}`,
            ).map((id) => (
              <div
                key={id}
                className="rounded-xl border border-border/50 bg-background/50 p-6"
              >
                <Skeleton className="mb-3 h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-11/12" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-12 space-y-4">
            <Skeleton className="mx-auto h-10 w-96 max-w-full rounded-lg" />
            <Skeleton className="mx-auto h-5 w-full max-w-2xl rounded-md" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => `limit-${index + 1}`).map(
              (id) => (
                <div
                  key={id}
                  className="rounded-2xl border border-border/50 bg-muted/20 p-6"
                >
                  <Skeleton className="mx-auto h-14 w-14 rounded-full" />
                  <Skeleton className="mx-auto mt-4 h-4 w-28" />
                  <Skeleton className="mx-auto mt-2 h-4 w-24" />
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-3xl border border-border/50 bg-muted/30 p-8 sm:p-12">
            <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
            <Skeleton className="mx-auto mt-6 h-9 w-80 max-w-full rounded-lg" />
            <Skeleton className="mx-auto mt-4 h-5 w-full max-w-xl rounded-md" />
            <Skeleton className="mx-auto mt-8 h-11 w-44 rounded-full" />
          </div>
        </div>
      </section>

      <footer className="border-t px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
          <Skeleton className="h-4 w-24" />
        </div>
      </footer>
    </main>
  );
}
