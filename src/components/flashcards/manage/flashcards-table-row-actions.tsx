"use client";

import { MoreVertical } from "lucide-react";
import { FlashcardActionMenuItems } from "@/components/flashcards/shared/flashcard-action-menu-items";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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
        <FlashcardActionMenuItems
          onCopy={onCopyRequested}
          onMove={onMoveRequested}
          studyLaterMarked={studyLaterMarked}
          onToggleStudyLater={onStudyLaterToggleRequested}
          onReset={onResetRequested}
          onDelete={onDeleteRequested}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
