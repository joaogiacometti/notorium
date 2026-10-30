"use client";

import {
  ArrowRightLeft,
  Copy,
  MoreVertical,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { StudyLaterMenuItem } from "@/components/flashcards/shared/study-later-menu-item";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FlashcardsTableRowActionsProps {
  onCopyRequested: () => void;
  onMoveRequested: () => void;
  onResetRequested: () => void;
  onDeleteRequested: () => void;
  onStudyLaterToggleRequested: () => void;
  studyLaterMarked: boolean;
  hasSelection?: boolean;
}

export function FlashcardsTableRowActions({
  onCopyRequested,
  onMoveRequested,
  onResetRequested,
  onDeleteRequested,
  onStudyLaterToggleRequested,
  studyLaterMarked,
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
        <DropdownMenuItem onClick={onCopyRequested} className="cursor-pointer">
          <Copy className="size-4" />
          Copy
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMoveRequested}>
          <ArrowRightLeft className="size-4" />
          Move
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <StudyLaterMenuItem
          marked={studyLaterMarked}
          onSelect={onStudyLaterToggleRequested}
        />
        <DropdownMenuItem onClick={onResetRequested} className="cursor-pointer">
          <RotateCcw className="size-4" />
          Reset
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
