"use client";

import { Clock, CopyPlus, Flame, type LucideIcon, Search } from "lucide-react";
import type { JSX } from "react";
import { ToolbarActionBar } from "@/components/flashcards/manage/flashcards-manager-toolbar-actions";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  type FlashcardManageFilter,
  flashcardManageFilterSchema,
} from "@/features/flashcards/validation";
import { cn } from "@/lib/utils";

interface FlashcardsManagerToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isManageScopeLoading: boolean;
  hasManageScopeError: boolean;
  selectedFlashcardIds: string[];
  total: number;
  filter?: FlashcardManageFilter;
  onToggleFilter: (filter: FlashcardManageFilter) => void;
  isCopyingSelection: boolean;
  onCopySelection: () => void;
  onOpenCreateDialog: () => void;
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
}

interface ToolbarStatusBadgesProps {
  isManageScopeLoading: boolean;
  hasManageScopeError: boolean;
  selectedCount: number;
  total: number;
}

function ToolbarStatusBadges({
  isManageScopeLoading,
  hasManageScopeError,
  selectedCount,
  total,
}: Readonly<ToolbarStatusBadgesProps>): JSX.Element {
  const hasSelection = selectedCount > 0;

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
      {hasSelection
        ? `${selectedCount} selected`
        : `${total} of ${total} flashcards`}
    </Badge>
  );
}

interface ManageFilterChipProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onToggle: () => void;
}

const manageFilterChips: Record<
  FlashcardManageFilter,
  { label: string; icon: LucideIcon }
> = {
  studyLater: { label: "Study later", icon: Clock },
  struggling: { label: "Struggling", icon: Flame },
};

// A filter, not an action: it sits with the result count, sized like it, and
// takes the primary tint while the table shows only the matching cards.
function ManageFilterChip({
  label,
  icon: Icon,
  active,
  onToggle,
}: Readonly<ManageFilterChipProps>): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`Show ${label} cards`}
      className={cn(
        "border-border font-normal",
        active
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
          : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
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
  filter,
  onToggleFilter,
  isCopyingSelection,
  onCopySelection,
  onOpenCreateDialog,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
}: Readonly<FlashcardsManagerToolbarProps>): JSX.Element {
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
              <div className="flex">
                <Button
                  type="button"
                  onClick={onOpenCreateDialog}
                  className="h-10 flex-1 gap-2 rounded-lg px-4 sm:flex-initial"
                >
                  <CopyPlus className="size-4" />
                  New Flashcard
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
                <ToolbarStatusBadges
                  isManageScopeLoading={isManageScopeLoading}
                  hasManageScopeError={hasManageScopeError}
                  selectedCount={selectedFlashcardIds.length}
                  total={total}
                />
                {flashcardManageFilterSchema.options.map((chipFilter) => (
                  <ManageFilterChip
                    key={chipFilter}
                    label={manageFilterChips[chipFilter].label}
                    icon={manageFilterChips[chipFilter].icon}
                    active={filter === chipFilter}
                    onToggle={() => onToggleFilter(chipFilter)}
                  />
                ))}
              </div>

              <ToolbarActionBar
                visible={selectedFlashcardIds.length > 0}
                isCopyingSelection={isCopyingSelection}
                onCopySelection={onCopySelection}
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
