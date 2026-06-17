"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { SubjectText } from "@/components/shared/subject-text";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { formatNotesCount } from "@/components/subjects/subjects-list-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSubjectKindLabel } from "@/features/subjects/constants";
import type { SubjectListItem } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface SubjectsTableActionsProps {
  subject: SubjectListItem;
  onDeleted: (subject: SubjectListItem) => void;
  onEdit: (subject: SubjectListItem) => void;
  hasSelection?: boolean;
}

function renderSubjectLabel(subject: SubjectListItem) {
  return (
    <Link
      href={`/subjects/${subject.id}`}
      aria-label={`Open ${subject.name}`}
      className="flex min-w-0 max-w-full items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex min-w-0 max-w-full flex-1 items-center gap-2 overflow-hidden">
        <SubjectText
          value={subject.name}
          mode="truncate"
          className="block min-w-0 max-w-full text-sm font-semibold leading-5.5 text-foreground/95"
        />
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {getSubjectKindLabel(subject.kind)}
        </span>
      </div>
    </Link>
  );
}

function SubjectsTableActions({
  subject,
  onDeleted,
  onEdit,
  hasSelection = false,
}: Readonly<SubjectsTableActionsProps>) {
  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function handleMenuSelect(
    event: Event,
    action: (subject: SubjectListItem) => void,
  ) {
    event.stopPropagation();
    action(subject);
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
          aria-label="Open subject actions"
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
          onSelect={(event) => handleMenuSelect(event, onDeleted)}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getSubjectColumns({
  onDeleted,
  onEdit,
  hasSelection,
}: Omit<SubjectsTableActionsProps, "subject">): ColumnDef<SubjectListItem>[] {
  return [
    {
      id: "subject",
      header: () => <TableHeaderLabel>Subject</TableHeaderLabel>,
      cell: ({ row }) => renderSubjectLabel(row.original),
    },
    {
      accessorKey: "notesCount",
      header: () => <TableHeaderLabel>Notes</TableHeaderLabel>,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatNotesCount(row.original.notesCount)}
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
          <SubjectsTableActions
            subject={row.original}
            onDeleted={onDeleted}
            onEdit={onEdit}
            hasSelection={hasSelection}
          />
        </div>
      ),
      enableHiding: false,
    },
  ];
}
