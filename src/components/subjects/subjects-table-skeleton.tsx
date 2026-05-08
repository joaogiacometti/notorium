import { TableSkeleton } from "@/components/shared/table-skeleton";
import { cn } from "@/lib/utils";

interface SubjectsTableSkeletonProps {
  className?: string;
  selectedRow?: boolean;
}

export function SubjectsTableSkeleton({
  className,
  selectedRow = false,
}: Readonly<SubjectsTableSkeletonProps>) {
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
                    "h-8 w-8 self-center justify-self-start rounded-full",
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
                  "h-8 w-8 self-center justify-self-start rounded-full",
              },
            ]
      }
      rowClassName="py-2.5"
      rowCount={3}
      footer={[
        { className: "h-7 w-28 rounded-full" },
        { className: "h-8 w-24 rounded-full" },
        { className: "h-8 w-24 rounded-full" },
      ]}
      footerClassName="mt-auto"
    />
  );
}
