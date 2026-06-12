"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { restoreSubject } from "@/app/actions/subjects";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { SubjectText } from "@/components/shared/subject-text";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import {
  formatNotesCount,
  isArchived,
} from "@/components/subjects/subjects-list-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SubjectListItem } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

interface SubjectsTableActionsProps {
  subject: SubjectListItem;
  onArchived: (subject: SubjectListItem) => void;
  onDeleted: (subject: SubjectListItem) => void;
  onEdit: (subject: SubjectListItem) => void;
  onRestored: () => void;
}

function renderSubjectLabel(subject: SubjectListItem) {
  const content = (
    <div className="min-w-0 max-w-full flex-1 overflow-hidden">
      <SubjectText
        value={subject.name}
        mode="truncate"
        className="block max-w-full text-sm font-semibold leading-5.5 text-foreground/95"
      />
    </div>
  );

  if (isArchived(subject)) {
    return <div className="flex min-w-0 items-center py-1">{content}</div>;
  }

  return (
    <Link
      href={`/subjects/${subject.id}`}
      aria-label={`Open ${subject.name}`}
      className="flex min-w-0 max-w-full items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {content}
    </Link>
  );
}

function SubjectsTableActions({
  subject,
  onArchived,
  onDeleted,
  onEdit,
  onRestored,
}: Readonly<SubjectsTableActionsProps>) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

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

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreSubject({ id: subject.id });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        onRestored();
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
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
          )}
          aria-label="Open subject actions"
          disabled={isPending}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleTriggerKeyDown}
        >
          <AsyncButtonContent
            pending={isPending}
            idleLabel=""
            pendingLabel=""
            idleIcon={<MoreVertical className="size-3.5" />}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isArchived(subject) ? (
          <DropdownMenuItem
            onSelect={(event) => {
              event.stopPropagation();
              handleRestore();
            }}
            className="cursor-pointer"
          >
            <ArchiveRestore className="size-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={(event) => handleMenuSelect(event, onEdit)}
              className="cursor-pointer"
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => handleMenuSelect(event, onArchived)}
              className="cursor-pointer"
            >
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          </>
        )}
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
  onArchived,
  onDeleted,
  onEdit,
  onRestored,
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
            onArchived={onArchived}
            onDeleted={onDeleted}
            onEdit={onEdit}
            onRestored={onRestored}
          />
        </div>
      ),
      enableHiding: false,
    },
  ];
}
