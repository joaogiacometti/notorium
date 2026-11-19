"use client";

import {
  Archive,
  Clock,
  CopyPlus,
  Flame,
  Layers,
  type LucideIcon,
  Repeat,
  Search,
} from "lucide-react";
import type { JSX } from "react";
import { ToolbarActionBar } from "@/components/flashcards/manage/flashcards-manager-toolbar-actions";
import type { BulkCardMarks } from "@/components/flashcards/manage/use-bulk-card-marks";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onFilterChange: (filter: FlashcardManageFilter | undefined) => void;
  isCopyingSelection: boolean;
  onCopySelection: () => void;
  onOpenCreateDialog: () => void;
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenBulkResetDialog: () => void;
  onClearSelection: () => void;
  bulkMarks: BulkCardMarks;
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
        className="h-6 w-36"
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
        : `${total} ${total === 1 ? "flashcard" : "flashcards"}`}
    </Badge>
  );
}

const inReviewValue = "inReview";

const manageFilterOptions: Array<{
  value: FlashcardManageFilter | typeof inReviewValue;
  label: string;
  icon: LucideIcon;
}> = [
  { value: inReviewValue, label: "In review", icon: Repeat },
  { value: "studyLater", label: "Study later", icon: Clock },
  { value: "struggling", label: "Struggling", icon: Flame },
  { value: "archived", label: "Archived", icon: Archive },
  { value: "all", label: "All cards", icon: Layers },
];

// One pick-one list choice; the default is what review will show.
function ManageFilterSelect({
  filter,
  onFilterChange,
}: Readonly<{
  filter?: FlashcardManageFilter;
  onFilterChange: (filter: FlashcardManageFilter | undefined) => void;
}>): JSX.Element {
  return (
    <Select
      value={filter ?? inReviewValue}
      onValueChange={(value) => {
        const parsed = flashcardManageFilterSchema.safeParse(value);
        onFilterChange(parsed.success ? parsed.data : undefined);
      }}
    >
      <SelectTrigger size="sm" aria-label="Show cards" className="h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {manageFilterOptions.map(({ value, label, icon: Icon }) => (
          <SelectItem key={value} value={value}>
            <Icon className="size-3.5" />
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  onFilterChange,
  isCopyingSelection,
  onCopySelection,
  onOpenCreateDialog,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onOpenBulkResetDialog,
  onClearSelection,
  bulkMarks,
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
                    placeholder="Search front, back, or folder path…"
                    className="h-10 border-border bg-background/80 pl-10"
                  />
                </div>
              </div>
              <div className="flex">
                <Button
                  type="button"
                  onClick={onOpenCreateDialog}
                  className="h-10 flex-1 gap-2 px-4 sm:flex-initial"
                >
                  <CopyPlus className="size-4" />
                  Create flashcard
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
              <div className="flex min-w-0 basis-full flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem] sm:flex-1 sm:basis-0">
                <ToolbarStatusBadges
                  isManageScopeLoading={isManageScopeLoading}
                  hasManageScopeError={hasManageScopeError}
                  selectedCount={selectedFlashcardIds.length}
                  total={total}
                />
                <ManageFilterSelect
                  filter={filter}
                  onFilterChange={onFilterChange}
                />
              </div>

              <ToolbarActionBar
                visible={selectedFlashcardIds.length > 0}
                isCopyingSelection={isCopyingSelection}
                onCopySelection={onCopySelection}
                onOpenBulkMoveDialog={onOpenBulkMoveDialog}
                onOpenBulkDeleteDialog={onOpenBulkDeleteDialog}
                onOpenBulkResetDialog={onOpenBulkResetDialog}
                onClearSelection={onClearSelection}
                bulkMarks={bulkMarks}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
