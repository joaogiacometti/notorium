"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { SubjectChip } from "@/components/shared/subject-chip";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import type {
  FlashcardEntity,
  FlashcardListEntity,
} from "@/lib/server/api-contracts";
import { FlashcardsTableRowActions } from "./flashcards-table-row-actions";

interface FlashcardsManagerTableProps {
  flashcards: FlashcardListEntity[];
  pageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
  onDeleted: (id: string) => void;
  onUpdated: (flashcard: FlashcardEntity) => void;
}

function getColumns(
  onUpdated: (flashcard: FlashcardEntity) => void,
  onDeleted: (id: string) => void,
  t: ReturnType<typeof useTranslations>,
): ColumnDef<FlashcardListEntity>[] {
  return [
    {
      accessorKey: "front",
      size: 272,
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
              title={getRichTextExcerpt(row.original.front, 240)}
            >
              {getRichTextExcerpt(row.original.front, 140)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "back",
      size: 200,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("table_back")}
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="min-w-0 truncate py-1 text-sm leading-6 text-muted-foreground"
          title={getRichTextExcerpt(row.original.back, 280)}
        >
          {getRichTextExcerpt(row.original.back, 180)}
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
        <div className="flex w-14 min-w-14 items-center justify-start">
          <FlashcardsTableRowActions
            flashcard={row.original}
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
  pageIndex,
  onPageIndexChange,
  onDeleted,
  onUpdated,
}: Readonly<FlashcardsManagerTableProps>) {
  const t = useTranslations("FlashcardsManager");
  return (
    <ManagerDataTable
      data={flashcards}
      columns={getColumns(onUpdated, onDeleted, t)}
      pageIndex={pageIndex}
      onPageIndexChange={onPageIndexChange}
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
      tableClassName="w-full table-fixed"
      getBodyCellClassName={() => "px-3 py-3 align-middle"}
      showColumnWidths
      columnResizeMode="onChange"
    />
  );
}
