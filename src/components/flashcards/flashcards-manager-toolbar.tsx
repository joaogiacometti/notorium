"use client";

import {
  ArrowRightLeft,
  Layers3,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { SubjectText } from "@/components/shared/subject-text";
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
import { LIMITS } from "@/lib/config/limits";
import type { DeckEntity, SubjectEntity } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface FlashcardsManagerToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  hasSubjects: boolean;
  validationMode: boolean;
  subjects: SubjectEntity[];
  decks: DeckEntity[];
  selectedSubjectId?: string;
  selectedDeckId?: string;
  isManageScopeLoading: boolean;
  selectedFlashcardIds: string[];
  selectedSubjectCardCount: number;
  total: number;
  validationIssuesCount: number;
  isValidatingAgain: boolean;
  onSubjectChange: (subjectId?: string) => void;
  onDeckChange: (deckId?: string) => void;
  onOpenValidateDialog: () => void;
  onOpenCreateDialog: () => void;
  onOpenValidateAgainDialog: () => void;
  onExitValidation: () => void;
  onOpenBulkMoveDialog: () => void;
  onOpenBulkDeleteDialog: () => void;
  onClearSelection: () => void;
}

export function FlashcardsManagerToolbar({
  searchQuery,
  onSearchQueryChange,
  hasSubjects,
  validationMode,
  subjects,
  decks,
  selectedSubjectId,
  selectedDeckId,
  isManageScopeLoading,
  selectedFlashcardIds,
  selectedSubjectCardCount,
  total,
  validationIssuesCount,
  isValidatingAgain,
  onSubjectChange,
  onDeckChange,
  onOpenValidateDialog,
  onOpenCreateDialog,
  onOpenValidateAgainDialog,
  onExitValidation,
  onOpenBulkMoveDialog,
  onOpenBulkDeleteDialog,
  onClearSelection,
}: Readonly<FlashcardsManagerToolbarProps>) {
  const selectedCountText =
    selectedFlashcardIds.length === 1
      ? "1 selected"
      : `${selectedFlashcardIds.length} selected`;
  const resultsCountText = `${total} of ${total} flashcards`;
  const selectedSubjectCountText =
    selectedSubjectCardCount === 1
      ? `1/${LIMITS.maxFlashcardsPerSubject} flashcard in this subject`
      : `${selectedSubjectCardCount}/${LIMITS.maxFlashcardsPerSubject} flashcards in this subject`;
  const validationIssuesCountText =
    validationIssuesCount === 1
      ? "1 card with issues"
      : `${validationIssuesCount} cards with issues`;
  const isActionBarVisible = validationMode || selectedFlashcardIds.length > 0;
  const actionBarVisibilityClasses = isActionBarVisible
    ? "visible opacity-100"
    : "pointer-events-none invisible opacity-0";
  const filteredDecks = selectedSubjectId
    ? decks.filter((d) => d.subjectId === selectedSubjectId)
    : [];

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
                  placeholder="Search front, back, or subject..."
                  className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onOpenValidateDialog}
                disabled={!hasSubjects}
                variant="outline"
                className="h-10 shrink-0 gap-2 rounded-lg px-3 shadow-sm sm:px-4"
              >
                <Sparkles className="size-4" />
                <span className="hidden sm:inline">Validate</span>
              </Button>
              <Button
                type="button"
                onClick={onOpenCreateDialog}
                disabled={!hasSubjects}
                className="h-10 flex-1 gap-2 rounded-lg px-4 shadow-sm sm:flex-initial"
              >
                <Plus className="size-4" />
                New Flashcard
              </Button>
            </div>
          </div>

          {!validationMode ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <Select
                  value={selectedSubjectId ?? "all"}
                  onValueChange={(value) =>
                    onSubjectChange(value === "all" ? undefined : value)
                  }
                  disabled={isManageScopeLoading}
                >
                  <SelectTrigger
                    data-testid="subject-filter-select"
                    className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs"
                  >
                    <SelectValue placeholder="Filter by Subject" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <SubjectText
                          value={subject.name}
                          mode="truncate"
                          className="block max-w-full"
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSubjectId && filteredDecks.length > 0 ? (
                <div className="min-w-0">
                  <Select
                    value={selectedDeckId ?? "all"}
                    onValueChange={(value) =>
                      onDeckChange(value === "all" ? undefined : value)
                    }
                    disabled={isManageScopeLoading}
                  >
                    <SelectTrigger
                      data-testid="deck-filter-select"
                      className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs"
                    >
                      <SelectValue placeholder="Filter by Deck" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">All Decks</SelectItem>
                      {filteredDecks.map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
              {validationMode ? (
                <StatusToneBadge
                  tone="danger"
                  className="px-2.5 py-0.5 text-[11px]"
                >
                  {validationIssuesCountText}
                </StatusToneBadge>
              ) : isManageScopeLoading ? (
                <>
                  <Skeleton
                    className="h-6 w-44 rounded-full"
                    data-testid="flashcards-manage-count-loading"
                  />
                  {selectedSubjectId ? (
                    <Skeleton className="h-6 w-52 rounded-full" />
                  ) : null}
                </>
              ) : (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border-border/70 bg-background/70 px-2.5 py-0.5 text-[11px]",
                      selectedFlashcardIds.length > 0
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {selectedFlashcardIds.length > 0 ? null : (
                      <Search className="size-3.5" />
                    )}
                    {selectedFlashcardIds.length > 0
                      ? selectedCountText
                      : resultsCountText}
                  </Badge>
                  {selectedSubjectId ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-primary/20 bg-primary/8 px-2.5 py-0.5 text-[11px] text-foreground transition-opacity",
                        selectedFlashcardIds.length > 0
                          ? "pointer-events-none invisible opacity-0"
                          : "visible opacity-100",
                      )}
                    >
                      <Layers3 className="size-3.5 text-primary" />
                      {selectedSubjectCountText}
                    </Badge>
                  ) : null}
                </>
              )}
            </div>

            <div
              className={cn(
                "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
                actionBarVisibilityClasses,
              )}
            >
              {validationMode ? (
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
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
