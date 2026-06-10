"use client";

import { ArrowRightLeft, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolbarActionBarProps {
  validationMode: boolean;
  refineMode: boolean;
  isValidatingAgain: boolean;
  isLoadingRefineGroups: boolean;
  actionBarVisibilityClasses: string;
  onOpenValidateAgainDialog: () => void;
  onExitValidation: () => void;
  onRefreshRefine: () => void;
  onExitRefine: () => void;
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
}

interface ValidationActionButtonsProps {
  isValidatingAgain: boolean;
  onOpenValidateAgainDialog: () => void;
  onExitValidation: () => void;
}

interface RefineActionButtonsProps {
  isLoadingRefineGroups: boolean;
  onRefreshRefine: () => void;
  onExitRefine: () => void;
}

interface SelectionActionButtonsProps {
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
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

function ValidationActionButtons({
  isValidatingAgain,
  onOpenValidateAgainDialog,
  onExitValidation,
}: Readonly<ValidationActionButtonsProps>): JSX.Element {
  return (
    <>
      <ToolbarIconActionButton
        ariaLabel="Validate Again"
        onClick={onOpenValidateAgainDialog}
        disabled={isValidatingAgain}
        className="rounded-md text-muted-foreground hover:text-foreground"
        icon={<RotateCw className="size-4" />}
      />
      <ToolbarIconActionButton
        ariaLabel="Exit Validation"
        onClick={onExitValidation}
        className="rounded-md text-muted-foreground hover:text-foreground"
        icon={<X className="size-4" />}
      />
    </>
  );
}

function RefineActionButtons({
  isLoadingRefineGroups,
  onRefreshRefine,
  onExitRefine,
}: Readonly<RefineActionButtonsProps>): JSX.Element {
  return (
    <>
      <ToolbarIconActionButton
        ariaLabel="Refresh Refine"
        onClick={onRefreshRefine}
        disabled={isLoadingRefineGroups}
        className="rounded-md text-muted-foreground hover:text-foreground"
        icon={<RotateCw className="size-4" />}
      />
      <ToolbarIconActionButton
        ariaLabel="Exit Refine"
        onClick={onExitRefine}
        className="rounded-md text-muted-foreground hover:text-foreground"
        icon={<X className="size-4" />}
      />
    </>
  );
}

function SelectionActionButtons({
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
}: Readonly<SelectionActionButtonsProps>): JSX.Element {
  return (
    <>
      <ToolbarIconActionButton
        ariaLabel="Move"
        onClick={onOpenBulkMoveDialog}
        className="rounded-md text-muted-foreground hover:text-foreground"
        icon={<ArrowRightLeft className="size-4" />}
      />
      <ToolbarIconActionButton
        ariaLabel="Reset"
        onClick={onOpenBulkResetDialog}
        className="rounded-md text-muted-foreground hover:text-foreground"
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
        className="rounded-md text-muted-foreground hover:text-foreground"
        icon={<X className="size-4" />}
      />
    </>
  );
}

/**
 * Mode-aware action bar for the manage toolbar: validation actions in
 * validation mode, refresh/exit in refine mode, and bulk selection
 * actions otherwise. Modes are mutually exclusive in the controller.
 *
 * Example: <ToolbarActionBar validationMode refineMode={false} ... />
 */
export function ToolbarActionBar({
  validationMode,
  refineMode,
  isValidatingAgain,
  isLoadingRefineGroups,
  actionBarVisibilityClasses,
  onOpenValidateAgainDialog,
  onExitValidation,
  onRefreshRefine,
  onExitRefine,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
}: Readonly<ToolbarActionBarProps>): JSX.Element {
  function renderModeActions(): JSX.Element {
    if (validationMode) {
      return (
        <ValidationActionButtons
          isValidatingAgain={isValidatingAgain}
          onOpenValidateAgainDialog={onOpenValidateAgainDialog}
          onExitValidation={onExitValidation}
        />
      );
    }

    if (refineMode) {
      return (
        <RefineActionButtons
          isLoadingRefineGroups={isLoadingRefineGroups}
          onRefreshRefine={onRefreshRefine}
          onExitRefine={onExitRefine}
        />
      );
    }

    return (
      <SelectionActionButtons
        onOpenBulkMoveDialog={onOpenBulkMoveDialog}
        onOpenBulkDeleteDialog={onOpenBulkDeleteDialog}
        onOpenBulkResetDialog={onOpenBulkResetDialog}
        onClearSelection={onClearSelection}
      />
    );
  }

  return (
    <div
      className={cn(
        "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
        actionBarVisibilityClasses,
      )}
    >
      {renderModeActions()}
    </div>
  );
}
