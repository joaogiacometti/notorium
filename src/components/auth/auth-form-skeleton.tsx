import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface AuthFieldSkeleton {
  /** Tailwind width of the label placeholder, e.g. `w-12`. */
  label: string;
  /** A right-aligned link beside the label (e.g. "Forgot password?"). */
  trailingLink?: boolean;
  /** Helper text below the input. */
  description?: boolean;
}

interface AuthFormSkeletonProps {
  /** Each row holds one field, or two that sit side by side from `md`. */
  rows: AuthFieldSkeleton[][];
  /** How many lines the subheading wraps to in the `md` card. */
  subheadingLines?: 1 | 2;
}

/**
 * Loading placeholder that mirrors {@link AuthFormShell}: the centered heading,
 * the form fields with the shell's spacing, the full-width submit button, and
 * the footer link line.
 *
 * @example
 * <AuthFormSkeleton rows={[[{ label: "w-12" }]]} />
 */
export function AuthFormSkeleton({
  rows,
  subheadingLines = 1,
}: Readonly<AuthFormSkeletonProps>) {
  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-4 sm:p-6 md:p-8">
        <div className="mb-4 flex flex-col items-center gap-2 md:mb-6">
          <div className="flex h-7 w-full items-center justify-center">
            <Skeleton className="h-6 w-3/5" />
          </div>
          <div className="flex w-full flex-col items-center">
            <SkeletonLine className="w-4/5" />
            {subheadingLines === 2 ? <SkeletonLine className="w-1/2" /> : null}
          </div>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          {rows.map((row) => (
            <div
              key={row.map((field) => field.label).join("-")}
              className={cn(
                "grid grid-cols-1 gap-4",
                row.length > 1 && "md:grid-cols-2",
              )}
            >
              {row.map((field) => (
                <FieldSkeleton key={field.label} field={field} />
              ))}
            </div>
          ))}
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="mt-5 flex h-5.75 items-center justify-center">
          <Skeleton className="h-4 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

function FieldSkeleton({ field }: Readonly<{ field: AuthFieldSkeleton }>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-5 items-center justify-between gap-2">
        <Skeleton className={cn("h-4", field.label)} />
        {field.trailingLink ? <Skeleton className="h-4 w-28" /> : null}
      </div>
      <Skeleton className="h-9 w-full" />
      {field.description ? <SkeletonLine className="w-40" /> : null}
    </div>
  );
}

function SkeletonLine({ className }: Readonly<{ className: string }>) {
  return (
    <div className="flex h-5 w-full items-center justify-center">
      <Skeleton className={cn("h-3.5", className)} />
    </div>
  );
}
