import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="grid md:grid-cols-2">
        <div className="p-4 sm:p-6 md:p-8">
          <Skeleton className="mx-auto h-7 w-52" />
          <Skeleton className="mx-auto mt-3 h-4 w-64" />
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-full rounded-md" />
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
  );
}
