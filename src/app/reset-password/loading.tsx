import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="rounded-xl border bg-card">
          <div className="grid md:grid-cols-2">
            <div className="p-4 sm:p-6 md:p-8">
              <Skeleton className="mx-auto h-7 w-56" />
              <Skeleton className="mx-auto mt-3 h-4 w-72" />
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="hidden md:block">
              <div className="flex h-full items-center justify-center bg-muted/60 p-8">
                <Skeleton className="size-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
