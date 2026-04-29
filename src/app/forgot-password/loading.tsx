import { Skeleton } from "@/components/ui/skeleton";

export default function ForgotPasswordLoading() {
  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6">
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto mt-3 h-4 w-64" />
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="mx-auto h-4 w-40" />
        </div>
      </div>
    </div>
  );
}
