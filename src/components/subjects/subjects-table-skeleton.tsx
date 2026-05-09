import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SubjectsTableSkeletonProps {
  className?: string;
  selectedRow?: boolean;
}

export function SubjectsTableSkeleton({
  className,
  selectedRow = false,
}: Readonly<SubjectsTableSkeletonProps>) {
  const mobileFooterSkeleton = (
    <div className="flex w-full flex-col gap-2 sm:hidden">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-8 w-full rounded-full" />
        <Skeleton className="h-8 w-full rounded-full" />
      </div>
    </div>
  );

  return (
    <TableSkeleton
      className={cn("flex h-full flex-col", className)}
      headerClassName="py-3"
      columnTemplate={
        selectedRow
          ? "2rem minmax(0, 1fr) 4.5rem 3rem"
          : "minmax(0, 1fr) 4.5rem 3rem"
      }
      headers={
        selectedRow
          ? [
              { content: <div /> },
              { className: "h-4 w-16" },
              { className: "h-4 w-12" },
              { content: <div /> },
            ]
          : [
              { className: "h-4 w-16" },
              { className: "h-4 w-12" },
              { content: <div /> },
            ]
      }
      rows={
        selectedRow
          ? [
              [
                {
                  className:
                    "h-4 w-4 rounded-sm self-center justify-self-center",
                },
                {
                  className: "h-6 w-full",
                },
                { className: "h-6 w-14" },
                {
                  className:
                    "h-7 w-7 self-center justify-self-start rounded-full sm:h-8 sm:w-8",
                },
              ],
            ]
          : [
              {
                className: "h-6 w-full",
              },
              { className: "h-6 w-14" },
              {
                className:
                  "h-7 w-7 self-center justify-self-start rounded-full sm:h-8 sm:w-8",
              },
            ]
      }
      rowClassName="py-2 sm:py-2.5"
      rowCount={3}
      footer={[
        { content: mobileFooterSkeleton },
        { className: "hidden h-7 w-28 rounded-full sm:block" },
        { className: "hidden h-8 w-24 rounded-full sm:block" },
        { className: "hidden h-8 w-24 rounded-full sm:block" },
      ]}
      footerClassName="mt-auto"
    />
  );
}
