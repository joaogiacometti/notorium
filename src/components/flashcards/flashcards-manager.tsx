"use client";

import {
  ArrowRightLeft,
  Layers3,
  Lock,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { BulkDeleteFlashcardsDialog } from "@/components/flashcards/bulk-delete-flashcards-dialog";
import { BulkMoveFlashcardsDialog } from "@/components/flashcards/bulk-move-flashcards-dialog";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/flashcards/edit-flashcard-dialog";
import { FlashcardsManagerTable } from "@/components/flashcards/flashcards-manager-table";
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
import { filterFlashcards } from "@/features/flashcards/flashcard-filters";
import { usePathname, useRouter } from "@/i18n/routing";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardEntity,
  FlashcardListEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface FlashcardsManagerProps {
  flashcards: FlashcardListEntity[];
  subjects: SubjectEntity[];
  initialSubjectId?: string;
}

export function FlashcardsManager({
  flashcards,
  subjects,
  initialSubjectId,
}: Readonly<FlashcardsManagerProps>) {
  const t = useTranslations("FlashcardsManager");
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [editingFlashcardId, setEditingFlashcardId] = useState<string | null>(
    null,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<string[]>(
    [],
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [localFlashcards, setLocalFlashcards] = useState(
    sortFlashcards(flashcards),
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const subjectNameById = Object.fromEntries(
    subjects.map((subject) => [subject.id, subject.name]),
  );

  useEffect(() => {
    setLocalFlashcards(sortFlashcards(flashcards));
    setPageIndex(0);
  }, [flashcards]);

  useEffect(() => {
    setSelectedSubjectId(initialSubjectId);
    setPageIndex(0);
  }, [initialSubjectId]);

  const selectedSubjectCardCount = selectedSubjectId
    ? localFlashcards.filter((card) => card.subjectId === selectedSubjectId)
        .length
    : 0;
  const isAtSubjectLimit =
    selectedSubjectCardCount >= LIMITS.maxFlashcardsPerSubject;
  const filteredFlashcards = filterFlashcards({
    flashcards: localFlashcards,
    searchQuery: deferredSearchQuery,
    subjectId: selectedSubjectId,
  });
  const hasSubjects = subjects.length > 0;
  const editingFlashcard =
    editingFlashcardId === null
      ? null
      : (localFlashcards.find(
          (currentFlashcard) => currentFlashcard.id === editingFlashcardId,
        ) ?? null);

  useEffect(() => {
    const filteredIds = new Set(
      filteredFlashcards.map((flashcard) => flashcard.id),
    );

    setSelectedFlashcardIds((current) =>
      current.filter((flashcardId) => filteredIds.has(flashcardId)),
    );
  }, [filteredFlashcards]);

  function updateSubjectFilter(nextSubjectId: string | undefined) {
    setSelectedSubjectId(nextSubjectId);
    setPageIndex(0);

    const query = new URLSearchParams();
    query.set("view", "manage");

    if (nextSubjectId) {
      query.set("subjectId", nextSubjectId);
    }

    startTransition(() => {
      router.replace(`${pathname}?${query.toString()}`);
    });
  }

  function handleCreated(flashcard: FlashcardEntity) {
    setLocalFlashcards((current) =>
      upsertFlashcard(current, {
        ...flashcard,
        subjectName: subjectNameById[flashcard.subjectId] ?? "",
      }),
    );
    setPageIndex(0);
  }

  function handleUpdated(flashcard: FlashcardEntity) {
    setLocalFlashcards((current) =>
      upsertFlashcard(current, {
        ...flashcard,
        subjectName: subjectNameById[flashcard.subjectId] ?? "",
      }),
    );
    setPageIndex(0);
  }

  function handleDeleted(id: string) {
    setLocalFlashcards((current) =>
      current.filter((flashcard) => flashcard.id !== id),
    );
    setEditingFlashcardId((current) => (current === id ? null : current));
    setSelectedFlashcardIds((current) =>
      current.filter((flashcardId) => flashcardId !== id),
    );
    setPageIndex(0);
  }

  function handleBulkDeleted(ids: string[]) {
    setLocalFlashcards((current) => {
      const nextFlashcards = current.filter(
        (flashcard) => !ids.includes(flashcard.id),
      );

      setPageIndex((currentPageIndex) =>
        getValidPageIndex(
          filterFlashcards({
            flashcards: nextFlashcards,
            searchQuery: deferredSearchQuery,
            subjectId: selectedSubjectId,
          }).length,
          currentPageIndex,
        ),
      );

      return nextFlashcards;
    });
    setEditingFlashcardId((current) =>
      current !== null && ids.includes(current) ? null : current,
    );
    setSelectedFlashcardIds([]);
  }

  function handleBulkMoved(ids: string[], subjectId: string) {
    setLocalFlashcards((current) => {
      const nextFlashcards = sortFlashcards(
        current.map((flashcard) =>
          ids.includes(flashcard.id)
            ? {
                ...flashcard,
                subjectId,
                subjectName:
                  subjectNameById[subjectId] ?? flashcard.subjectName,
              }
            : flashcard,
        ),
      );

      setPageIndex((currentPageIndex) =>
        getValidPageIndex(
          filterFlashcards({
            flashcards: nextFlashcards,
            searchQuery: deferredSearchQuery,
            subjectId: selectedSubjectId,
          }).length,
          currentPageIndex,
        ),
      );

      return nextFlashcards;
    });
    setSelectedFlashcardIds([]);
  }

  function handleEditOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setEditingFlashcardId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
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
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setPageIndex(0);
                    }}
                    placeholder={t("search_placeholder")}
                    className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={!hasSubjects}
                className="h-10 w-full shrink-0 gap-2 rounded-lg px-4 shadow-sm sm:w-auto"
              >
                <Plus className="size-4" />
                {t("new_flashcard")}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <Select
                  value={selectedSubjectId ?? "all"}
                  onValueChange={(value) =>
                    updateSubjectFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs">
                    <SelectValue
                      placeholder={t("subject_filter_placeholder")}
                    />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">{t("subject_all")}</SelectItem>
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
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
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
                    ? t("selected_count", {
                        count: selectedFlashcardIds.length,
                      })
                    : t("results_count", {
                        filtered: filteredFlashcards.length,
                        total: localFlashcards.length,
                      })}
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
                    {t("selected_subject_count", {
                      count: selectedSubjectCardCount,
                      max: LIMITS.maxFlashcardsPerSubject,
                    })}
                  </Badge>
                ) : null}
              </div>
              <div
                className={cn(
                  "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-[8.5rem]",
                  selectedFlashcardIds.length > 0
                    ? "visible opacity-100"
                    : "pointer-events-none invisible opacity-0",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setBulkMoveOpen(true)}
                  className="rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={t("bulk_move")}
                >
                  <ArrowRightLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t("bulk_delete")}
                >
                  <Trash2 className="size-4" />
                </Button>
                <div className="hidden h-5 w-px bg-border/60 sm:block" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedFlashcardIds([])}
                  className="rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={t("clear_selection")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedSubjectId && isAtSubjectLimit ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-linear-to-r from-amber-500/12 via-amber-500/8 to-transparent px-4 py-2.5 text-sm shadow-xs">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            {t("limit_message", { max: LIMITS.maxFlashcardsPerSubject })}
          </p>
        </div>
      ) : null}
      <Card className="overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
        {localFlashcards.length > 0 ? (
          <FlashcardsManagerTable
            flashcards={filteredFlashcards}
            selectedFlashcardIds={selectedFlashcardIds}
            pageIndex={pageIndex}
            onEditRequested={(flashcard) => setEditingFlashcardId(flashcard.id)}
            onPageIndexChange={setPageIndex}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onSelectedFlashcardIdsChange={setSelectedFlashcardIds}
          />
        ) : (
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center sm:px-10">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <Layers3 className="size-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              {t("empty_title")}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t("empty_description")}
            </p>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!hasSubjects}
              className="mt-6 h-10 gap-2 rounded-lg px-4 shadow-sm"
            >
              <Plus className="size-4" />
              {t("new_flashcard")}
            </Button>
          </CardContent>
        )}
      </Card>
      <CreateFlashcardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
        subjectId={selectedSubjectId}
        subjects={subjects}
      />
      {editingFlashcard ? (
        <EditFlashcardDialog
          flashcard={editingFlashcard}
          subjects={subjects}
          open={editingFlashcardId !== null}
          onOpenChange={handleEditOpenChange}
          onUpdated={handleUpdated}
        />
      ) : null}
      <BulkDeleteFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDeleted={handleBulkDeleted}
      />
      <BulkMoveFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkMoveOpen}
        onOpenChange={setBulkMoveOpen}
        onMoved={handleBulkMoved}
        subjects={subjects}
      />
    </div>
  );
}

function toTimestamp(value: Date | string): number {
  return new Date(value).getTime();
}

function sortFlashcards(
  flashcards: FlashcardListEntity[],
): FlashcardListEntity[] {
  return [...flashcards].sort(
    (left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt),
  );
}

function upsertFlashcard(
  current: FlashcardListEntity[],
  next: FlashcardListEntity,
): FlashcardListEntity[] {
  const withoutNext = current.filter((flashcard) => flashcard.id !== next.id);

  return sortFlashcards([...withoutNext, next]);
}

function getValidPageIndex(
  totalItems: number,
  currentPageIndex: number,
  pageSize: number = 25,
): number {
  return Math.max(
    0,
    Math.min(currentPageIndex, Math.ceil(totalItems / pageSize) - 1),
  );
}
