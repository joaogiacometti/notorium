"use client";

import { BookOpenText } from "lucide-react";
import { ImproveCardDialog } from "@/components/flashcards/manage/improve-card-dialog";
import { useRefineCardActions } from "@/components/flashcards/manage/use-refine-card-actions";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import type { ManagerColumnDef } from "@/components/shared/manager-table-features";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StrugglingFlashcard } from "@/features/flashcards/refine/types";
import {
  getRichTextExcerpt,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface FlashcardsRefineResultsProps {
  cards: StrugglingFlashcard[];
  onRefineApplied: () => void;
}

const refineFrontPreviewLength = 20;
const strugglingTone = getStatusToneClasses("danger");

function getRefineFrontPreview(front: string) {
  return getRichTextExcerpt(front, refineFrontPreviewLength);
}

function getRefineFrontTitle(front: string) {
  return richTextToPlainText(front) || undefined;
}

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "front":
      return "min-w-[6rem]";
    case "lapseCount":
      return "w-24 min-w-24";
    case "subjectName":
      return "w-24 min-w-20";
    case "actions":
      return "w-36 min-w-36";
    default:
      return "";
  }
}

function getColumns(
  improvingCardId: string | null,
  onImproveCard: (card: StrugglingFlashcard) => void,
): ManagerColumnDef<StrugglingFlashcard>[] {
  return [
    {
      accessorKey: "front",
      size: 96,
      header: () => <TableHeaderLabel>Front</TableHeaderLabel>,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3 py-1">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-xs",
              strugglingTone.border,
              strugglingTone.bg,
              strugglingTone.text,
            )}
          >
            <BookOpenText className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold leading-6 text-foreground/95"
              title={getRefineFrontTitle(row.original.front)}
            >
              {getRefineFrontPreview(row.original.front)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "lapseCount",
      size: 96,
      header: () => <TableHeaderLabel>Lapses</TableHeaderLabel>,
      cell: ({ row }) => (
        <StatusToneBadge tone="danger" className="shrink-0">
          {row.original.lapseCount}
        </StatusToneBadge>
      ),
    },
    {
      accessorKey: "subjectName",
      size: 96,
      header: () => <TableHeaderLabel>Subject</TableHeaderLabel>,
      cell: ({ row }) => (
        <span
          className="block max-w-[7rem] truncate text-sm text-muted-foreground"
          title={row.original.subjectName}
        >
          {row.original.subjectName}
        </span>
      ),
    },
    {
      id: "actions",
      size: 144,
      header: () => <div className="flex w-36 min-w-36 justify-start" />,
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={improvingCardId !== null}
          onClick={() => onImproveCard(row.original)}
        >
          <AsyncButtonContent
            pending={improvingCardId === row.original.id}
            idleLabel="Improve"
            pendingLabel="Analyzing…"
          />
        </Button>
      ),
    },
  ];
}

export function FlashcardsRefineResults({
  cards,
  onRefineApplied,
}: Readonly<FlashcardsRefineResultsProps>) {
  const {
    improvingCardId,
    activeImprove,
    setActiveImprove,
    handleImproveCard,
  } = useRefineCardActions();

  return (
    <Card className="overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
      <ManagerDataTable
        data={cards}
        columns={getColumns(improvingCardId, handleImproveCard)}
        pageIndex={0}
        pageCount={1}
        pageSize={cards.length}
        isLoading={false}
        loadingSkeleton={
          <TableSkeleton
            columnTemplate="1fr 6rem 6rem 9rem"
            headers={[
              { className: "h-4 w-16" },
              { className: "h-4 w-20" },
              { className: "h-4 w-20" },
              { content: <div /> },
            ]}
            rows={[
              { className: "h-14 w-full" },
              { className: "h-7 w-24 rounded-full" },
              { className: "h-6 w-full" },
              { className: "h-9 w-28 rounded-md" },
            ]}
            rowCount={3}
            footer={[]}
          />
        }
        onPageIndexChange={() => {}}
        selectedRowIds={[]}
        selectionAriaLabel=""
        pageLabel={(current, total) => `Page ${current} of ${total}`}
        prevLabel="Previous"
        nextLabel="Next"
        emptyLabel="No struggling cards. Cards you keep forgetting show up here."
        getRowId={(row) => row.id}
        tableClassName="w-full min-w-[25rem]"
        getHeaderCellClassName={getColumnClassName}
        getBodyCellClassName={(columnId) =>
          cn("px-3 py-3 align-middle", getColumnClassName(columnId))
        }
      />
      {activeImprove && (
        <ImproveCardDialog
          card={activeImprove.card}
          proposedBack={activeImprove.proposedBack}
          open
          onOpenChange={(open) => {
            if (!open) {
              setActiveImprove(null);
            }
          }}
          onImproved={onRefineApplied}
        />
      )}
    </Card>
  );
}
