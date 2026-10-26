"use client";

import {
  ArrowRightLeft,
  Copy,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FlashcardsTableRowActionsProps {
  onEditRequested: () => void;
  onCopyRequested: () => void;
  onMoveRequested: () => void;
  onResetRequested: () => void;
  onDeleteRequested: () => void;
  hasSelection?: boolean;
}

export function FlashcardsTableRowActions({
  onEditRequested,
  onCopyRequested,
  onMoveRequested,
  onResetRequested,
  onDeleteRequested,
  hasSelection = false,
}: Readonly<FlashcardsTableRowActionsProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${ROW_ACTION_TRIGGER_CLASS} size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground${hasSelection ? " invisible pointer-events-none" : ""}`}
          aria-label="Open flashcard actions"
        >
          <MoreVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEditRequested} className="cursor-pointer">
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyRequested} className="cursor-pointer">
          <Copy className="size-4" />
          Copy
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMoveRequested}>
          <ArrowRightLeft className="size-4" />
          Move
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetRequested} className="cursor-pointer">
          <RotateCcw className="size-4" />
          Reset
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDeleteRequested}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
