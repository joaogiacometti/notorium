"use client";

import {
  Clock,
  CopyPlus,
  Loader2,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { JSX } from "react";
import { ToolbarActionBar } from "@/components/flashcards/manage/flashcards-manager-toolbar-actions";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FlashcardsManagerToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isManageScopeLoading: boolean;
  hasManageScopeError: boolean;
  selectedFlashcardIds: string[];
  total: number;
  refineMode: boolean;
  studyLaterFilterActive: boolean;
  onToggleStudyLaterFilter: () => void;
  strugglingCount: number;
  isLoadingStrugglingCards: boolean;
  aiEnabled: boolean;
  isCopyingSelection: boolean;
  onCopySelection: () => void;
  onOpenCreateDialog: () => void;
  onStartRefine: () => void;
  onRefreshRefine: () => void;
  onExitRefine: () => void;
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
}

interface ToolbarViewModel {
  selectedCountText: string;
  resultsCountText: string;
  refineCountText: string;
  actionBarVisibilityClasses: string;
  hasSelection: boolean;
}

interface ToolbarStatusBadgesProps {
  refineMode: boolean;
  isManageScopeLoading: boolean;
  hasManageScopeError: boolean;
  hasSelection: boolean;
  selectedCountText: string;
  resultsCountText: string;
  refineCountText: string;
}

interface RefineCardsButtonProps {
  refineMode: boolean;
  isLoadingStrugglingCards: boolean;
  onStartRefine: () => void;
}

function getToolbarViewModel({
  refineMode,
  selectedFlashcardIds,
  total,
  strugglingCount,
}: {
  refineMode: boolean;
  selectedFlashcardIds: string[];
  total: number;
  strugglingCount: number;
}): ToolbarViewModel {
  const selectedCount = selectedFlashcardIds.length;
  const hasSelection = selectedCount > 0;

  return {
    selectedCountText:
      selectedCount === 1 ? "1 selected" : `${selectedCount} selected`,
    resultsCountText: `${total} of ${total} flashcards`,
    refineCountText: `${strugglingCount} struggling`,
    actionBarVisibilityClasses:
      refineMode || hasSelection
        ? "visible opacity-100"
        : "pointer-events-none invisible opacity-0",
    hasSelection,
  };
}

function ToolbarStatusBadges({
  refineMode,
  isManageScopeLoading,
  hasManageScopeError,
  hasSelection,
  selectedCountText,
  resultsCountText,
  refineCountText,
}: Readonly<ToolbarStatusBadgesProps>): JSX.Element {
  if (refineMode) {
    return (
      <Badge
        variant="outline"
        className="rounded-md border-border px-2.5 py-0.5 text-xs text-foreground"
      >
        <Sparkles className="size-3.5" />
        {refineCountText}
      </Badge>
    );
  }

  if (hasManageScopeError) {
    return (
      <StatusToneBadge tone="danger">Flashcards unavailable</StatusToneBadge>
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
        "rounded-md border-border px-2.5 py-0.5 text-xs",
        hasSelection ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {hasSelection ? null : <Search className="size-3.5" />}
      {hasSelection ? selectedCountText : resultsCountText}
    </Badge>
  );
}

interface StudyLaterFilterChipProps {
  active: boolean;
  onToggle: () => void;
}

// A filter, not an action: it sits with the result count, sized like it, and
// takes the primary tint while the table shows only study-later cards.
function StudyLaterFilterChip({
  active,
  onToggle,
}: Readonly<StudyLaterFilterChipProps>): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={onToggle}
      aria-pressed={active}
      aria-label="Show Study later cards"
      className={cn(
        "border-border font-normal",
        active
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
          : "text-muted-foreground",
      )}
    >
      <Clock className="size-3.5" />
      Study later
    </Button>
  );
}

// Opens the refine mode that lists struggling cards for AI improvement.
function RefineCardsButton({
  refineMode,
  isLoadingStrugglingCards,
  onStartRefine,
}: Readonly<RefineCardsButtonProps>): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onStartRefine}
      disabled={refineMode || isLoadingStrugglingCards}
      aria-label="Refine cards"
      className="h-10 shrink-0 gap-2 rounded-lg border-primary/30 bg-primary/5 px-3 text-primary hover:bg-primary/10 hover:text-primary sm:px-4"
    >
      {isLoadingStrugglingCards && !refineMode ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Wand2 className="size-4" />
      )}
      <span className="hidden sm:inline">Refine cards</span>
    </Button>
  );
}

export function FlashcardsManagerToolbar({
  searchQuery,
  onSearchQueryChange,
  isManageScopeLoading,
  hasManageScopeError,
  selectedFlashcardIds,
  total,
  refineMode,
  studyLaterFilterActive,
  onToggleStudyLaterFilter,
  strugglingCount,
  isLoadingStrugglingCards,
  aiEnabled,
  isCopyingSelection,
  onCopySelection,
  onOpenCreateDialog,
  onStartRefine,
  onRefreshRefine,
  onExitRefine,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
}: Readonly<FlashcardsManagerToolbarProps>): JSX.Element {
  const viewModel = getToolbarViewModel({
    refineMode,
    selectedFlashcardIds,
    total,
    strugglingCount,
  });
  const createButton = (
    <Button
      type="button"
      onClick={onOpenCreateDialog}
      className="h-10 flex-1 gap-2 rounded-lg px-4 sm:flex-initial"
    >
      <CopyPlus className="size-4" />
      New Flashcard
    </Button>
  );

  return (
    <TooltipProvider>
      <Card className="border-border py-0">
        <CardContent className="relative px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 lg:max-w-3xl">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) =>
                      onSearchQueryChange(event.target.value)
                    }
                    placeholder="Search front, back, or subject path..."
                    className="h-10 rounded-lg border-border bg-background/80 pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {aiEnabled ? (
                  <RefineCardsButton
                    refineMode={refineMode}
                    isLoadingStrugglingCards={isLoadingStrugglingCards}
                    onStartRefine={onStartRefine}
                  />
                ) : null}
                {createButton}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
                <ToolbarStatusBadges
                  refineMode={refineMode}
                  isManageScopeLoading={isManageScopeLoading}
                  hasManageScopeError={hasManageScopeError}
                  hasSelection={viewModel.hasSelection}
                  selectedCountText={viewModel.selectedCountText}
                  resultsCountText={viewModel.resultsCountText}
                  refineCountText={viewModel.refineCountText}
                />
                {refineMode ? null : (
                  <StudyLaterFilterChip
                    active={studyLaterFilterActive}
                    onToggle={onToggleStudyLaterFilter}
                  />
                )}
              </div>

              <ToolbarActionBar
                refineMode={refineMode}
                isLoadingStrugglingCards={isLoadingStrugglingCards}
                actionBarVisibilityClasses={
                  viewModel.actionBarVisibilityClasses
                }
                isCopyingSelection={isCopyingSelection}
                onCopySelection={onCopySelection}
                onRefreshRefine={onRefreshRefine}
                onExitRefine={onExitRefine}
                onOpenBulkMoveDialog={onOpenBulkMoveDialog}
                onOpenBulkDeleteDialog={onOpenBulkDeleteDialog}
                onOpenBulkResetDialog={onOpenBulkResetDialog}
                onClearSelection={onClearSelection}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
