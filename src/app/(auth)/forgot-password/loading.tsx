import { Skeleton } from "@/components/ui/skeleton";

export default function ForgotPasswordLoading() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="grid md:grid-cols-2">
        <div className="p-4 sm:p-6 md:p-8">
          <Skeleton className="mx-auto h-7 w-48" />
          <Skeleton className="mx-auto mt-3 h-4 w-72" />
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <div className="hidden md:block">
          <div className="flex h-full items-center justify-center bg-muted p-8">
            <Skeleton className="size-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
