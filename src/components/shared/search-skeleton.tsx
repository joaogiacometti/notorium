"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SearchSkeleton() {
  return (
    <div className="p-2 space-y-2">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="space-y-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
