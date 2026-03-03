import { Skeleton } from "@/components/ui/skeleton";

export default function SignupLoading() {
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="h-7 w-44" />

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="mx-auto h-4 w-52" />
          </div>
        </div>
      </div>
    </div>
  );
}
