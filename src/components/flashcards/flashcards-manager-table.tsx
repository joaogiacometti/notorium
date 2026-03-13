"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { SubjectChip } from "@/components/shared/subject-chip";
import type { FlashcardManageItem } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";
import { FlashcardsTableRowActions } from "./flashcards-table-row-actions";

interface FlashcardsManagerTableProps {
  flashcards: FlashcardManageItem[];
  total: number;
  selectedFlashcardIds: string[];
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  loadingLabel: string;
  onEditRequested: (flashcardId: string) => void;
  onPageIndexChange: (pageIndex: number) => void;
  onDeleted: () => void;
  onSelectedFlashcardIdsChange: (ids: string[]) => void;
  onUpdated: () => void;
}

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "select":
      return "w-9 min-w-9";
    case "front":
      return "min-w-[10rem]";
    case "back":
      return "min-w-[8rem]";
    case "subjectName":
      return "min-w-[8rem]";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function getColumns(
  onEditRequested: (flashcardId: string) => void,
  onUpdated: () => void,
  onDeleted: () => void,
  t: ReturnType<typeof useTranslations>,
): ColumnDef<FlashcardManageItem>[] {
  return [
    {
      accessorKey: "front",
      size: 160,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("table_front")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3 py-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-xs">
            <CreditCard className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold leading-6 text-foreground/95"
              title={row.original.frontExcerpt}
            >
              {row.original.frontExcerpt}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "back",
      size: 140,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("table_back")}
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="min-w-0 truncate py-1 text-sm leading-6 text-muted-foreground"
          title={row.original.backExcerpt}
        >
          {row.original.backExcerpt}
        </div>
      ),
    },
    {
      accessorKey: "subjectName",
      size: 112,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("table_subject")}
        </div>
      ),
      cell: ({ row }) => (
        <SubjectChip
          href={`/subjects/${row.original.subjectId}`}
          label={row.original.subjectName}
          maxWidthClassName="max-w-[7.5rem]"
        />
      ),
    },
    {
      id: "actions",
      size: 56,
      header: () => <div className="flex w-14 min-w-14 justify-start" />,
      cell: ({ row }) => (
        <div className="flex w-14 min-w-14 items-center justify-start pl-1">
          <FlashcardsTableRowActions
            flashcard={row.original}
            onEditRequested={() => onEditRequested(row.original.id)}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        </div>
      ),
      enableHiding: false,
    },
  ];
}

export function FlashcardsManagerTable({
  flashcards,
  total,
  selectedFlashcardIds,
  pageIndex,
  pageSize,
  isLoading,
  loadingLabel,
  onEditRequested,
  onPageIndexChange,
  onDeleted,
  onSelectedFlashcardIdsChange,
  onUpdated,
}: Readonly<FlashcardsManagerTableProps>) {
  const t = useTranslations("FlashcardsManager");
  return (
    <ManagerDataTable
      data={flashcards}
      columns={getColumns(onEditRequested, onUpdated, onDeleted, t)}
      pageIndex={pageIndex}
      pageCount={Math.max(1, Math.ceil(total / pageSize))}
      pageSize={pageSize}
      isLoading={isLoading}
      loadingLabel={loadingLabel}
      onPageIndexChange={onPageIndexChange}
      selectedRowIds={selectedFlashcardIds}
      onSelectedRowIdsChange={onSelectedFlashcardIdsChange}
      selectionAriaLabel={t("select_flashcard")}
      pageLabel={(current, total) =>
        t("page", {
          current,
          total,
        })
      }
      prevLabel={t("prev")}
      nextLabel={t("next")}
      emptyLabel={t("no_results")}
      getRowId={(row) => row.id}
      tableClassName="w-full min-w-160"
      getHeaderCellClassName={getColumnClassName}
      getBodyCellClassName={(columnId) =>
        cn("px-3 py-3 align-middle", getColumnClassName(columnId))
      }
    />
  );
}
