"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard } from "lucide-react";
import { FlashcardsTableRowActions } from "@/components/flashcards/flashcards-table-row-actions";
import { ValidationIssueTooltip } from "@/components/flashcards/validation-issue-tooltip";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { SubjectChip } from "@/components/shared/subject-chip";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getRichTextExcerpt,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import type {
  FlashcardValidationIssue,
  FlashcardValidationItem,
} from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface FlashcardsValidationResultsProps {
  issues: FlashcardValidationIssue[];
  flashcards: FlashcardValidationItem[];
  onEdit: (flashcardId: string) => void;
  onDelete: (flashcard: { id: string; front: string }) => void;
}

interface ValidationResultRow {
  id: string;
  front: string;
  issueType: "incorrect" | "confusing" | "duplicate";
  explanation: string;
  subjectName: string;
  subjectId: string;
}

const flashcardFrontPreviewLength = 30;

function getFlashcardFrontPreview(front: string) {
  return getRichTextExcerpt(front, flashcardFrontPreviewLength);
}

function getFlashcardFrontTitle(front: string) {
  return richTextToPlainText(front) || undefined;
}

function getIssueTypeLabel(issueType: string): string {
  switch (issueType) {
    case "incorrect":
      return "Incorrect Info";
    case "confusing":
      return "Confusing";
    case "duplicate":
      return "Duplicate/Similar";
    default:
      return issueType;
  }
}

function getIssueTypeBadgeVariant(
  issueType: string,
): "destructive" | "secondary" | "outline" {
  switch (issueType) {
    case "incorrect":
      return "destructive";
    case "confusing":
      return "secondary";
    case "duplicate":
      return "outline";
    default:
      return "outline";
  }
}

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "front":
      return "min-w-[10rem]";
    case "issue":
      return "min-w-[12rem]";
    case "subjectName":
      return "min-w-[8rem]";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function getColumns(
  onEdit: (flashcardId: string) => void,
  onDelete: (flashcard: { id: string; front: string }) => void,
): ColumnDef<ValidationResultRow>[] {
  return [
    {
      accessorKey: "front",
      size: 160,
      header: () => <TableHeaderLabel>Front</TableHeaderLabel>,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3 py-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-destructive/15 bg-destructive/10 text-destructive shadow-xs">
            <CreditCard className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold leading-6 text-foreground/95"
              title={getFlashcardFrontTitle(row.original.front)}
            >
              {getFlashcardFrontPreview(row.original.front)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "issue",
      size: 200,
      header: () => <TableHeaderLabel>Issue</TableHeaderLabel>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 py-1">
          <Badge
            variant={getIssueTypeBadgeVariant(row.original.issueType)}
            className="shrink-0 rounded-full"
          >
            {getIssueTypeLabel(row.original.issueType)}
          </Badge>
          <ValidationIssueTooltip explanation={row.original.explanation} />
        </div>
      ),
    },
    {
      accessorKey: "subjectName",
      size: 112,
      header: () => <TableHeaderLabel>Subject</TableHeaderLabel>,
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
            onEditRequested={() => onEdit(row.original.id)}
            onResetRequested={() => {}}
            onDeleteRequested={() =>
              onDelete({
                id: row.original.id,
                front: row.original.front,
              })
            }
          />
        </div>
      ),
      enableHiding: false,
    },
  ];
}

export function FlashcardsValidationResults({
  issues,
  flashcards,
  onEdit,
  onDelete,
}: Readonly<FlashcardsValidationResultsProps>) {
  const flashcardsMap = new Map(flashcards.map((card) => [card.id, card]));

  const tableData: ValidationResultRow[] = issues
    .map((issue) => {
      const flashcard = flashcardsMap.get(issue.id);
      if (!flashcard) return null;
      return {
        id: issue.id,
        front: flashcard.front,
        issueType: issue.issueType,
        explanation: issue.explanation,
        subjectName: flashcard.subjectName,
        subjectId: flashcard.subjectId,
      };
    })
    .filter((row): row is ValidationResultRow => row !== null);

  return (
    <Card className="overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
      <ManagerDataTable
        data={tableData}
        columns={getColumns(onEdit, onDelete)}
        pageIndex={0}
        pageCount={1}
        pageSize={tableData.length}
        isLoading={false}
        loadingSkeleton={
          <TableSkeleton
            columnTemplate="1.35fr 1.2fr 0.7fr 3.5rem"
            headers={[
              { className: "h-4 w-16" },
              { className: "h-4 w-20" },
              { className: "h-4 w-20" },
              { content: <div /> },
            ]}
            rows={[
              { className: "h-14 w-full" },
              { className: "h-6 w-full" },
              { className: "h-7 w-24 rounded-full" },
              {
                className:
                  "h-10 w-10 self-center justify-self-center rounded-full",
              },
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
        emptyLabel="All validated flashcards look good!"
        getRowId={(row) => row.id}
        tableClassName="w-full min-w-[40rem]"
        getHeaderCellClassName={getColumnClassName}
        getBodyCellClassName={(columnId) =>
          cn("px-3 py-3 align-middle", getColumnClassName(columnId))
        }
      />
    </Card>
  );
}
