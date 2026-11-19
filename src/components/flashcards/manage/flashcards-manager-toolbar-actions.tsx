"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  Clock,
  Copy,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { JSX } from "react";
import type { BulkCardMarks } from "@/components/flashcards/manage/use-bulk-card-marks";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolbarActionBarProps {
  visible: boolean;
  isCopyingSelection: boolean;
  onCopySelection: () => void;
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
  bulkMarks: BulkCardMarks;
}

interface ToolbarIconActionButtonProps {
  ariaLabel: string;
  className: string;
  disabled?: boolean;
  icon: JSX.Element;
  onClick: () => void;
}

function ToolbarIconActionButton({
  ariaLabel,
  className,
  disabled = false,
  icon,
  onClick,
}: Readonly<ToolbarIconActionButtonProps>): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          disabled={disabled}
          className={className}
          aria-label={ariaLabel}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{ariaLabel}</TooltipContent>
    </Tooltip>
  );
}

const actionClassName =
  "rounded-md text-muted-foreground hover:text-foreground";

/**
 * Bulk selection actions for the manage toolbar, shown while cards are selected.
 *
 * Example: <ToolbarActionBar visible={selectedIds.length > 0} ... />
 */
export function ToolbarActionBar({
  visible,
  isCopyingSelection,
  onCopySelection,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
  bulkMarks,
}: Readonly<ToolbarActionBarProps>): JSX.Element {
  const { studyLater, archive } = bulkMarks.intents;

  return (
    <div
      className={cn(
        "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
        // Phones give the bar its own row, so it only takes space while shown;
        // wider screens reserve its slot to avoid layout shift on selection.
        visible
          ? "visible opacity-100 max-sm:w-full max-sm:justify-between"
          : "pointer-events-none invisible opacity-0 max-sm:hidden",
      )}
    >
      <ToolbarIconActionButton
        ariaLabel={isCopyingSelection ? "Copying…" : "Copy"}
        onClick={onCopySelection}
        disabled={isCopyingSelection}
        className={actionClassName}
        icon={
          isCopyingSelection ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Copy className="size-4" />
          )
        }
      />
      <ToolbarIconActionButton
        ariaLabel="Move"
        onClick={onOpenBulkMoveDialog}
        className={actionClassName}
        icon={<ArrowRightLeft className="size-4" />}
      />
      <ToolbarIconActionButton
        ariaLabel={studyLater === "clear" ? "Clear study later" : "Study later"}
        onClick={bulkMarks.applyStudyLater}
        disabled={bulkMarks.isSaving || studyLater === null}
        className={actionClassName}
        icon={<Clock className="size-4" />}
      />
      <ToolbarIconActionButton
        ariaLabel={archive === "unarchive" ? "Unarchive" : "Archive"}
        onClick={bulkMarks.applyArchive}
        disabled={bulkMarks.isSaving}
        className={actionClassName}
        icon={
          archive === "unarchive" ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )
        }
      />
      <ToolbarIconActionButton
        ariaLabel="Reset"
        onClick={onOpenBulkResetDialog}
        className={actionClassName}
        icon={<RotateCcw className="size-4" />}
      />
      <ToolbarIconActionButton
        ariaLabel="Delete"
        onClick={onOpenBulkDeleteDialog}
        className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
        icon={<Trash2 className="size-4" />}
      />
      <div className="hidden h-5 w-px bg-border/60 sm:block" />
      <ToolbarIconActionButton
        ariaLabel="Clear selection"
        onClick={onClearSelection}
        className={actionClassName}
        icon={<X className="size-4" />}
      />
    </div>
  );
}
