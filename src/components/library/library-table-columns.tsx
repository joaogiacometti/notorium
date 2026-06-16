"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatReadingProgress } from "@/features/library/constants";
import { formatRelativeTime } from "@/lib/dates/format";
import type { LibraryBookEntity } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface LibraryTableActionsProps {
  book: LibraryBookEntity;
  onEdit: (book: LibraryBookEntity) => void;
  onDelete: (book: LibraryBookEntity) => void;
  hasSelection?: boolean;
}

function LibraryTableActions({
  book,
  onEdit,
  onDelete,
  hasSelection = false,
}: Readonly<LibraryTableActionsProps>) {
  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function handleMenuSelect(
    event: Event,
    action: (book: LibraryBookEntity) => void,
  ) {
    event.stopPropagation();
    action(book);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            ROW_ACTION_TRIGGER_CLASS,
            "size-9 rounded-full border border-transparent bg-background/70 text-muted-foreground/75 shadow-xs hover:border-border/70 hover:bg-background hover:text-foreground",
            hasSelection && "invisible pointer-events-none",
          )}
          aria-label="Open book actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleTriggerKeyDown}
        >
          <MoreVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={(event) => handleMenuSelect(event, onEdit)}
          className="cursor-pointer"
        >
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => handleMenuSelect(event, onDelete)}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface LibraryColumnsOptions {
  onEdit: (book: LibraryBookEntity) => void;
  onDelete: (book: LibraryBookEntity) => void;
  hasSelection?: boolean;
}

export function getLibraryColumns({
  onEdit,
  onDelete,
  hasSelection,
}: Readonly<LibraryColumnsOptions>): ColumnDef<LibraryBookEntity>[] {
  return [
    {
      id: "title",
      header: () => <TableHeaderLabel>Book</TableHeaderLabel>,
      // Cap the width so a long title truncates instead of expanding the column
      // and pushing the row actions off-screen; the full title shows on hover.
      cell: ({ row }) => (
        <span
          className="block max-w-[12rem] truncate text-sm font-semibold leading-5.5 text-foreground/95 sm:max-w-[18rem] lg:max-w-[24rem]"
          title={row.original.title}
        >
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "author",
      header: () => <TableHeaderLabel>Author</TableHeaderLabel>,
      cell: ({ row }) => (
        <span
          className="block max-w-[10rem] truncate text-sm text-muted-foreground sm:max-w-[16rem]"
          title={row.original.author ?? undefined}
        >
          {row.original.author ?? "—"}
        </span>
      ),
    },
    {
      id: "progress",
      header: () => <TableHeaderLabel>Progress</TableHeaderLabel>,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatReadingProgress(
            row.original.currentPage,
            row.original.totalPages,
          )}
        </span>
      ),
    },
    {
      id: "lastRead",
      header: () => <TableHeaderLabel>Last read</TableHeaderLabel>,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.original.lastReadAt
            ? formatRelativeTime(row.original.lastReadAt)
            : "Not started"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => (
        <div className="flex w-10 min-w-10 justify-start sm:w-14 sm:min-w-14" />
      ),
      cell: ({ row }) => (
        <div className="flex w-10 min-w-10 items-center justify-start pl-1 sm:w-14 sm:min-w-14">
          <LibraryTableActions
            book={row.original}
            onEdit={onEdit}
            onDelete={onDelete}
            hasSelection={hasSelection}
          />
        </div>
      ),
      enableHiding: false,
    },
  ];
}
