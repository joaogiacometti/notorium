"use client";

import {
  ArrowRightLeft,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { JSX } from "react";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FlashcardsManagerToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  validationMode: boolean;
  isManageScopeLoading: boolean;
  selectedFlashcardIds: string[];
  total: number;
  validationIssuesCount: number;
  isValidatingAgain: boolean;
  onOpenValidateDialog: () => void;
  onOpenCreateDialog: () => void;
  onOpenValidateAgainDialog: () => void;
  onExitValidation: () => void;
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
}

interface ToolbarViewModel {
  selectedCountText: string;
  resultsCountText: string;
  validationIssuesCountText: string;
  actionBarVisibilityClasses: string;
  hasSelection: boolean;
}

interface ToolbarStatusBadgesProps {
  validationMode: boolean;
  isManageScopeLoading: boolean;
  hasSelection: boolean;
  selectedCountText: string;
  resultsCountText: string;
  validationIssuesCountText: string;
}

interface ToolbarActionBarProps {
  validationMode: boolean;
  isValidatingAgain: boolean;
  actionBarVisibilityClasses: string;
  onOpenValidateAgainDialog: () => void;
  onExitValidation: () => void;
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

interface SelectionActionButtonsProps {
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
}

function getToolbarViewModel({
  validationMode,
  selectedFlashcardIds,
  total,
  validationIssuesCount,
}: {
  validationMode: boolean;
  selectedFlashcardIds: string[];
  total: number;
  validationIssuesCount: number;
}): ToolbarViewModel {
  const selectedCount = selectedFlashcardIds.length;
  const hasSelection = selectedCount > 0;

  return {
    selectedCountText:
      selectedCount === 1 ? "1 selected" : `${selectedCount} selected`,
    resultsCountText: `${total} of ${total} flashcards`,
    validationIssuesCountText:
      validationIssuesCount === 1
        ? "1 card with issues"
        : `${validationIssuesCount} cards with issues`,
    actionBarVisibilityClasses:
      validationMode || hasSelection
        ? "visible opacity-100"
        : "pointer-events-none invisible opacity-0",
    hasSelection,
  };
}

function ToolbarStatusBadges({
  validationMode,
  isManageScopeLoading,
  hasSelection,
  selectedCountText,
  resultsCountText,
  validationIssuesCountText,
}: Readonly<ToolbarStatusBadgesProps>): JSX.Element {
  if (validationMode) {
    return (
      <StatusToneBadge tone="danger" className="px-2.5 py-0.5 text-[11px]">
        {validationIssuesCountText}
      </StatusToneBadge>
    );
  }

  if (isManageScopeLoading) {
    return (
      <Skeleton
        className="h-6 w-44 rounded-full"
        data-testid="flashcards-manage-count-loading"
      />
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-border/70 bg-background/70 px-2.5 py-0.5 text-[11px]",
        hasSelection ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {hasSelection ? null : <Search className="size-3.5" />}
      {hasSelection ? selectedCountText : resultsCountText}
    </Badge>
  );
}

function ValidationActionButtons({
  isValidatingAgain,
  onOpenValidateAgainDialog,
  onExitValidation,
}: Readonly<ValidationActionButtonsProps>): JSX.Element {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenValidateAgainDialog}
        disabled={isValidatingAgain}
        className="rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Validate Again"
      >
        <RotateCw className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onExitValidation}
        className="rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Exit Validation"
      >
        <X className="size-4" />
      </Button>
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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenBulkMoveDialog}
        className="rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Move"
      >
        <ArrowRightLeft className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenBulkResetDialog}
        className="rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Reset"
      >
        <RotateCcw className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenBulkDeleteDialog}
        className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label="Delete"
      >
        <Trash2 className="size-4" />
      </Button>
      <div className="hidden h-5 w-px bg-border/60 sm:block" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClearSelection}
        className="rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Clear selection"
      >
        <X className="size-4" />
      </Button>
    </>
  );
}

function ToolbarActionBar({
  validationMode,
  isValidatingAgain,
  actionBarVisibilityClasses,
  onOpenValidateAgainDialog,
  onExitValidation,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
}: Readonly<ToolbarActionBarProps>): JSX.Element {
  return (
    <div
      className={cn(
        "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
        actionBarVisibilityClasses,
      )}
    >
      {validationMode ? (
        <ValidationActionButtons
          isValidatingAgain={isValidatingAgain}
          onOpenValidateAgainDialog={onOpenValidateAgainDialog}
          onExitValidation={onExitValidation}
        />
      ) : (
        <SelectionActionButtons
          onOpenBulkMoveDialog={onOpenBulkMoveDialog}
          onOpenBulkDeleteDialog={onOpenBulkDeleteDialog}
          onOpenBulkResetDialog={onOpenBulkResetDialog}
          onClearSelection={onClearSelection}
        />
      )}
    </div>
  );
}

export function FlashcardsManagerToolbar({
  searchQuery,
  onSearchQueryChange,
  validationMode,
  isManageScopeLoading,
  selectedFlashcardIds,
  total,
  validationIssuesCount,
  isValidatingAgain,
  onOpenValidateDialog,
  onOpenCreateDialog,
  onOpenValidateAgainDialog,
  onExitValidation,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
}: Readonly<FlashcardsManagerToolbarProps>): JSX.Element {
  const viewModel = getToolbarViewModel({
    validationMode,
    selectedFlashcardIds,
    total,
    validationIssuesCount,
  });

  return (
    <Card className="relative overflow-hidden border-border/70 bg-linear-to-br from-card via-card to-primary/5 py-0 shadow-none">
      <div className="absolute top-0 right-0 size-28 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 lg:max-w-3xl">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="Search front, back, or deck path..."
                  className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onOpenValidateDialog}
                variant="outline"
                className="h-10 shrink-0 gap-2 rounded-lg px-3 shadow-sm sm:px-4"
              >
                <Sparkles className="size-4" />
                <span className="hidden sm:inline">Validate</span>
              </Button>
              <Button
                type="button"
                onClick={onOpenCreateDialog}
                className="h-10 flex-1 gap-2 rounded-lg px-4 shadow-sm sm:flex-initial"
              >
                <Plus className="size-4" />
                New Flashcard
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
              <ToolbarStatusBadges
                validationMode={validationMode}
                isManageScopeLoading={isManageScopeLoading}
                hasSelection={viewModel.hasSelection}
                selectedCountText={viewModel.selectedCountText}
                resultsCountText={viewModel.resultsCountText}
                validationIssuesCountText={viewModel.validationIssuesCountText}
              />
            </div>

            <ToolbarActionBar
              validationMode={validationMode}
              isValidatingAgain={isValidatingAgain}
              actionBarVisibilityClasses={viewModel.actionBarVisibilityClasses}
              onOpenValidateAgainDialog={onOpenValidateAgainDialog}
              onExitValidation={onExitValidation}
              onOpenBulkMoveDialog={onOpenBulkMoveDialog}
              onOpenBulkDeleteDialog={onOpenBulkDeleteDialog}
              onOpenBulkResetDialog={onOpenBulkResetDialog}
              onClearSelection={onClearSelection}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
