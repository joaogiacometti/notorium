import { Skeleton } from "@/components/ui/skeleton";

export default function LocaleLoading() {
  const featureCards = Array.from(
    { length: 5 },
    (_, index) => `locale-loading-feature-${index}`,
  );
  const limits = Array.from(
    { length: 4 },
    (_, index) => `locale-loading-limit-${index}`,
  );

  return (
    <main className="flex flex-col">
      <section className="flex flex-col items-center gap-6 px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">
        <Skeleton className="h-9 w-40 rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="mx-auto h-12 w-72 max-w-full sm:h-14 sm:w-120 lg:h-16 lg:w-160" />
          <Skeleton className="mx-auto h-12 w-56 max-w-full sm:h-14 sm:w-96 lg:h-16 lg:w-120" />
        </div>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-5 w-72 max-w-full sm:w-120" />
          <Skeleton className="mx-auto h-5 w-64 max-w-full sm:w-96" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-11 w-36 rounded-md" />
          <Skeleton className="h-11 w-28 rounded-md" />
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="mx-auto mb-12 h-10 w-72" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((id, index) => (
              <div
                key={id}
                className={`rounded-xl border border-border/50 bg-background/50 p-6 ${
                  index === 0 ? "sm:col-span-2 lg:col-span-2" : ""
                } ${index === 3 ? "sm:col-span-2 lg:col-span-2" : ""} ${
                  index === 4 ? "sm:col-span-2 lg:col-span-3" : ""
                }`}
              >
                <Skeleton className="mb-4 size-12 rounded-xl" />
                <Skeleton className="mb-3 h-7 w-48" />
                <Skeleton className="h-5 w-full max-w-96" />
                <Skeleton className="mt-2 h-5 w-4/5 max-w-80" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-12 space-y-4">
            <Skeleton className="mx-auto h-10 w-80 max-w-full" />
            <Skeleton className="mx-auto h-5 w-full max-w-2xl" />
            <Skeleton className="mx-auto h-5 w-4/5 max-w-xl" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {limits.map((id) => (
              <div
                key={id}
                className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/50 bg-muted/20 p-6"
              >
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-4 w-full max-w-36" />
                <Skeleton className="h-4 w-3/4 max-w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-3xl border border-border/50 bg-muted/30 p-8 sm:p-12">
            <Skeleton className="mx-auto mb-6 size-16 rounded-2xl" />
            <Skeleton className="mx-auto mb-4 h-9 w-80 max-w-full" />
            <Skeleton className="mx-auto h-5 w-full max-w-xl" />
            <Skeleton className="mx-auto mt-2 h-5 w-4/5 max-w-lg" />
            <Skeleton className="mx-auto mt-8 h-11 w-48 rounded-full" />
          </div>
        </div>
      </section>
    </main>
  );
}
