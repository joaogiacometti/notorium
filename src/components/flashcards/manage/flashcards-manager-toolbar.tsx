"use client";

import { CopyPlus, Search, Sparkles } from "lucide-react";
import type { JSX } from "react";
import { FlashcardsAiToolsMenu } from "@/components/flashcards/manage/flashcards-ai-tools-menu";
import { ToolbarActionBar } from "@/components/flashcards/manage/flashcards-manager-toolbar-actions";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  refineMode: boolean;
  refineMasteredCount: number;
  refineStrugglingCount: number;
  isLoadingRefineGroups: boolean;
  aiEnabled: boolean;
  hasDecks: boolean;
  onOpenValidateDialog: () => void;
  onOpenCreateDialog: () => void;
  onOpenValidateAgainDialog: () => void;
  onExitValidation: () => void;
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
  validationIssuesCountText: string;
  refineCountText: string;
  actionBarVisibilityClasses: string;
  hasSelection: boolean;
}

interface ToolbarStatusBadgesProps {
  validationMode: boolean;
  refineMode: boolean;
  isManageScopeLoading: boolean;
  hasSelection: boolean;
  selectedCountText: string;
  resultsCountText: string;
  validationIssuesCountText: string;
  refineCountText: string;
}

function getToolbarViewModel({
  validationMode,
  refineMode,
  selectedFlashcardIds,
  total,
  validationIssuesCount,
  refineMasteredCount,
  refineStrugglingCount,
}: {
  validationMode: boolean;
  refineMode: boolean;
  selectedFlashcardIds: string[];
  total: number;
  validationIssuesCount: number;
  refineMasteredCount: number;
  refineStrugglingCount: number;
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
    refineCountText: `${refineMasteredCount} mastered · ${refineStrugglingCount} struggling`,
    actionBarVisibilityClasses:
      validationMode || refineMode || hasSelection
        ? "visible opacity-100"
        : "pointer-events-none invisible opacity-0",
    hasSelection,
  };
}

function ToolbarStatusBadges({
  validationMode,
  refineMode,
  isManageScopeLoading,
  hasSelection,
  selectedCountText,
  resultsCountText,
  validationIssuesCountText,
  refineCountText,
}: Readonly<ToolbarStatusBadgesProps>): JSX.Element {
  if (validationMode) {
    return (
      <StatusToneBadge tone="danger" className="px-2.5 py-0.5 text-[11px]">
        {validationIssuesCountText}
      </StatusToneBadge>
    );
  }

  if (refineMode) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-border/70 bg-background/70 px-2.5 py-0.5 text-[11px] text-foreground"
      >
        <Sparkles className="size-3.5" />
        {refineCountText}
      </Badge>
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

export function FlashcardsManagerToolbar({
  searchQuery,
  onSearchQueryChange,
  validationMode,
  isManageScopeLoading,
  selectedFlashcardIds,
  total,
  validationIssuesCount,
  isValidatingAgain,
  refineMode,
  refineMasteredCount,
  refineStrugglingCount,
  isLoadingRefineGroups,
  aiEnabled,
  hasDecks,
  onOpenValidateDialog,
  onOpenCreateDialog,
  onOpenValidateAgainDialog,
  onExitValidation,
  onStartRefine,
  onRefreshRefine,
  onExitRefine,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
}: Readonly<FlashcardsManagerToolbarProps>): JSX.Element {
  const viewModel = getToolbarViewModel({
    validationMode,
    refineMode,
    selectedFlashcardIds,
    total,
    validationIssuesCount,
    refineMasteredCount,
    refineStrugglingCount,
  });
  const createButton = (
    <Button
      type="button"
      onClick={onOpenCreateDialog}
      disabled={!hasDecks}
      className="h-10 flex-1 gap-2 rounded-lg px-4 shadow-sm sm:flex-initial"
    >
      <CopyPlus className="size-4" />
      New Flashcard
    </Button>
  );

  return (
    <TooltipProvider>
      <Card className="relative overflow-hidden rounded-xl border-border/70 bg-linear-to-br from-card via-card to-primary/5 py-0 shadow-none">
        <CardContent className="relative px-4 py-3 sm:px-5 sm:py-4">
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
                    placeholder="Search front, back, or deck path..."
                    className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {aiEnabled ? (
                  <FlashcardsAiToolsMenu
                    refineMode={refineMode}
                    isLoadingRefineGroups={isLoadingRefineGroups}
                    onOpenValidateDialog={onOpenValidateDialog}
                    onStartRefine={onStartRefine}
                  />
                ) : null}
                {hasDecks ? (
                  createButton
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex flex-1 sm:flex-initial"
                        data-testid="new-flashcard-disabled-trigger"
                      >
                        {createButton}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Create a deck first to add flashcards.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
                <ToolbarStatusBadges
                  validationMode={validationMode}
                  refineMode={refineMode}
                  isManageScopeLoading={isManageScopeLoading}
                  hasSelection={viewModel.hasSelection}
                  selectedCountText={viewModel.selectedCountText}
                  resultsCountText={viewModel.resultsCountText}
                  validationIssuesCountText={
                    viewModel.validationIssuesCountText
                  }
                  refineCountText={viewModel.refineCountText}
                />
              </div>

              <ToolbarActionBar
                validationMode={validationMode}
                refineMode={refineMode}
                isValidatingAgain={isValidatingAgain}
                isLoadingRefineGroups={isLoadingRefineGroups}
                actionBarVisibilityClasses={
                  viewModel.actionBarVisibilityClasses
                }
                onOpenValidateAgainDialog={onOpenValidateAgainDialog}
                onExitValidation={onExitValidation}
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
