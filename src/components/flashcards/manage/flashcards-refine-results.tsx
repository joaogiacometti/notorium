"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BookOpenText } from "lucide-react";
import { ImproveCardDialog } from "@/components/flashcards/manage/improve-card-dialog";
import { MergePreviewDialog } from "@/components/flashcards/manage/merge-preview-dialog";
import { useRefineCardActions } from "@/components/flashcards/manage/use-refine-card-actions";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  RefineCardSummary,
  RefineGroups,
} from "@/features/flashcards/refine/types";
import {
  getRichTextExcerpt,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface FlashcardsRefineResultsProps {
  groups: RefineGroups;
  onRefineApplied: () => void;
}

type RefineGroupKind = "mastered" | "struggling";

interface RefineResultRow {
  card: RefineCardSummary;
  group: RefineGroupKind;
}

interface RefineRowActionProps {
  row: RefineResultRow;
  pendingCardId: string | null;
  onAction: (card: RefineCardSummary) => void;
}

const refineFrontPreviewLength = 20;

function getRefineFrontPreview(front: string) {
  return getRichTextExcerpt(front, refineFrontPreviewLength);
}

function getRefineFrontTitle(front: string) {
  return richTextToPlainText(front) || undefined;
}

function getGroupTone(group: RefineGroupKind) {
  return group === "mastered" ? "success" : "danger";
}

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "front":
      return "min-w-[6rem]";
    case "group":
      return "w-24 min-w-24";
    case "deckName":
      return "w-24 min-w-20";
    case "actions":
      return "w-36 min-w-36";
    default:
      return "";
  }
}

function RefineRowActionButton({
  row,
  pendingCardId,
  onAction,
}: Readonly<RefineRowActionProps>) {
  const isMastered = row.group === "mastered";

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pendingCardId !== null}
      onClick={() => onAction(row.card)}
    >
      <AsyncButtonContent
        pending={pendingCardId === row.card.id}
        idleLabel={isMastered ? "Level up" : "Improve"}
        pendingLabel={isMastered ? "Finding…" : "Analyzing…"}
      />
    </Button>
  );
}

function getColumns(
  proposingCardId: string | null,
  improvingCardId: string | null,
  onProposeMerge: (card: RefineCardSummary) => void,
  onImproveCard: (card: RefineCardSummary) => void,
): ColumnDef<RefineResultRow>[] {
  return [
    {
      accessorKey: "front",
      size: 96,
      header: () => <TableHeaderLabel>Front</TableHeaderLabel>,
      cell: ({ row }) => {
        const tone = getStatusToneClasses(getGroupTone(row.original.group));
        return (
          <div className="flex min-w-0 items-center gap-3 py-1">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-xs",
                tone.border,
                tone.bg,
                tone.text,
              )}
            >
              <BookOpenText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-sm font-semibold leading-6 text-foreground/95"
                title={getRefineFrontTitle(row.original.card.front)}
              >
                {getRefineFrontPreview(row.original.card.front)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "group",
      size: 96,
      header: () => <TableHeaderLabel>Streak</TableHeaderLabel>,
      cell: ({ row }) => (
        <StatusToneBadge
          tone={getGroupTone(row.original.group)}
          className="shrink-0"
        >
          {row.original.group === "mastered" ? "Mastered" : "Struggling"}
        </StatusToneBadge>
      ),
    },
    {
      accessorKey: "deckName",
      size: 96,
      header: () => <TableHeaderLabel>Deck</TableHeaderLabel>,
      cell: ({ row }) => (
        <span
          className="block max-w-[7rem] truncate text-sm text-muted-foreground"
          title={row.original.card.deckName}
        >
          {row.original.card.deckName}
        </span>
      ),
    },
    {
      id: "actions",
      size: 144,
      header: () => <div className="flex w-36 min-w-36 justify-start" />,
      cell: ({ row }) =>
        row.original.group === "mastered" ? (
          <RefineRowActionButton
            row={row.original}
            pendingCardId={proposingCardId}
            onAction={onProposeMerge}
          />
        ) : (
          <RefineRowActionButton
            row={row.original}
            pendingCardId={improvingCardId}
            onAction={onImproveCard}
          />
        ),
      enableHiding: false,
    },
  ];
}

export function FlashcardsRefineResults({
  groups,
  onRefineApplied,
}: Readonly<FlashcardsRefineResultsProps>) {
  const {
    proposingCardId,
    improvingCardId,
    activeMerge,
    activeImprove,
    setActiveMerge,
    setActiveImprove,
    handleProposeMerge,
    handleImproveCard,
  } = useRefineCardActions();

  const tableData: RefineResultRow[] = [
    ...groups.mastered.map((card) => ({ card, group: "mastered" as const })),
    ...groups.struggling.map((card) => ({
      card,
      group: "struggling" as const,
    })),
  ];

  return (
    <Card className="overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
      <ManagerDataTable
        data={tableData}
        columns={getColumns(
          proposingCardId,
          improvingCardId,
          handleProposeMerge,
          handleImproveCard,
        )}
        pageIndex={0}
        pageCount={1}
        pageSize={tableData.length}
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
        emptyLabel="No mastered or struggling cards yet. Keep reviewing!"
        getRowId={(row) => row.card.id}
        tableClassName="w-full min-w-[25rem]"
        getHeaderCellClassName={getColumnClassName}
        getBodyCellClassName={(columnId) =>
          cn("px-3 py-3 align-middle", getColumnClassName(columnId))
        }
      />
      {activeMerge && (
        <MergePreviewDialog
          primaryFlashcardId={activeMerge.card.id}
          primaryFront={activeMerge.card.front}
          proposal={activeMerge.proposal}
          sources={activeMerge.sources}
          open
          onOpenChange={(open) => {
            if (!open) {
              setActiveMerge(null);
            }
          }}
          onMerged={onRefineApplied}
        />
      )}
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
