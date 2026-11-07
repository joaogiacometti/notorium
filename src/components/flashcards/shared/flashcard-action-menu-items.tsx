"use client";

import { ArrowRightLeft, Copy, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { StudyLaterMenuItem } from "@/components/flashcards/shared/study-later-menu-item";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface FlashcardActionMenuItemsProps {
  /** Omit where the card is already being edited in place. */
  onEdit?: () => void;
  onCopy: () => void;
  /** Omit where moving would leave the current surface (review sessions). */
  onMove?: () => void;
  studyLaterMarked: boolean;
  onToggleStudyLater: () => void;
  onReset: () => void;
  onDelete: () => void;
}

/**
 * The one flashcard action list for the manage table, detail page, and review
 * session, so every surface offers the same actions in the same order:
 * editing actions, then scheduling, then the destructive action on its own.
 *
 * @example
 * <DropdownMenuContent align="end">
 *   <FlashcardActionMenuItems onCopy={copy} studyLaterMarked={false} ... />
 * </DropdownMenuContent>
 */
export function FlashcardActionMenuItems({
  onEdit,
  onCopy,
  onMove,
  studyLaterMarked,
  onToggleStudyLater,
  onReset,
  onDelete,
}: Readonly<FlashcardActionMenuItemsProps>) {
  return (
    <>
      {onEdit ? (
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={onCopy}>
        <Copy className="size-4" />
        Copy
      </DropdownMenuItem>
      {onMove ? (
        <DropdownMenuItem onClick={onMove}>
          <ArrowRightLeft className="size-4" />
          Move
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <StudyLaterMenuItem
        marked={studyLaterMarked}
        onSelect={onToggleStudyLater}
      />
      <DropdownMenuItem onClick={onReset}>
        <RotateCcw className="size-4" />
        Reset
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={onDelete}>
        <Trash2 className="size-4" />
        Delete
      </DropdownMenuItem>
    </>
  );
}
