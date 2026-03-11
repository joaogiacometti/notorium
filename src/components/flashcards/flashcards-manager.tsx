"use client";

import { Layers3, Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { FlashcardsTableRowActions } from "@/components/flashcards/flashcards-table-row-actions";
import { SubjectText } from "@/components/shared/subject-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deriveFlashcardsManagerState } from "@/features/flashcards/manager";
import { Link } from "@/i18n/routing";
import { LIMITS } from "@/lib/config/limits";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import type {
  FlashcardEntity,
  FlashcardListEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const allSubjectsValue = "__all__";

interface FlashcardsManagerProps {
  flashcards: FlashcardListEntity[];
  subjects: SubjectEntity[];
  initialSubjectId?: string;
}

export function FlashcardsManager({
  flashcards: initialFlashcards,
  subjects,
  initialSubjectId,
}: Readonly<FlashcardsManagerProps>) {
  const t = useTranslations("FlashcardsManager");
  const [flashcards, setFlashcards] = useState(initialFlashcards);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    initialSubjectId ?? allSubjectsValue,
  );

  const derivedState = deriveFlashcardsManagerState({
    allSubjectsValue,
    flashcards,
    maxFlashcardsPerSubject: LIMITS.maxFlashcardsPerSubject,
    page,
    pageSize: PAGE_SIZE,
    searchQuery,
    selectedSubjectId,
  });
  const selectedActionSubject = derivedState.selectedActionSubjectId
    ? subjects.find(
        (subject) => subject.id === derivedState.selectedActionSubjectId,
      )
    : undefined;
  const {
    clampedPage,
    filteredFlashcards,
    isAtSubjectLimit,
    paginatedFlashcards,
    selectedSubjectCardCount,
    totalPages,
  } = derivedState;

  useEffect(() => {
    setFlashcards(initialFlashcards);
  }, [initialFlashcards]);

  useEffect(() => {
    setSelectedSubjectId(initialSubjectId ?? allSubjectsValue);
    setPage(1);
  }, [initialSubjectId]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function updateSubject(subjectId: string) {
    setSelectedSubjectId(subjectId);
    setPage(1);
  }

  function handleUpdate(updated: FlashcardEntity) {
    setFlashcards((current) =>
      current.map((card) =>
        card.id === updated.id ? { ...card, ...updated } : card,
      ),
    );
  }

  function handleDelete(id: string) {
    setFlashcards((current) => current.filter((card) => card.id !== id));
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {selectedActionSubject && isAtSubjectLimit ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            {t("limit_message", { max: LIMITS.maxFlashcardsPerSubject })}
          </p>
        </div>
      ) : null}

      <Card className="gap-0 overflow-hidden border-border/60 bg-card/95 py-0 shadow-none lg:flex-1 lg:min-h-0">
        <CardHeader
          className={cn(
            "border-b border-border/60 bg-muted/20 px-4 pt-4 sm:px-6",
            selectedActionSubject ? "gap-4 pb-4" : "gap-0 pb-3",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 p-2">
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_13rem]">
                <Input
                  id="flashcards-search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("search_placeholder")}
                  className="border-border/60 bg-transparent shadow-none"
                />
                <Select value={selectedSubjectId} onValueChange={updateSubject}>
                  <SelectTrigger className="w-full border-border/60 bg-transparent shadow-none">
                    <SelectValue
                      placeholder={t("subject_filter_placeholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={allSubjectsValue}>
                      {t("subject_all")}
                    </SelectItem>
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

            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0 lg:items-center">
              <CreateFlashcardDialog
                subjectId={selectedActionSubject?.id}
                subjects={subjects}
                trigger={
                  <Button
                    size="sm"
                    className="gap-1.5 shadow-none"
                    title={isAtSubjectLimit ? t("limit_tooltip") : undefined}
                  >
                    <Plus className="size-4" />
                    {t("new_flashcard")}
                  </Button>
                }
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={(flashcard) => {
                  const subjectName = subjects.find(
                    (subject) => subject.id === flashcard.subjectId,
                  )?.name;

                  if (!subjectName) {
                    return;
                  }

                  setFlashcards((current) => [
                    { ...flashcard, subjectName },
                    ...current,
                  ]);
                }}
              />
            </div>
          </div>

          {selectedActionSubject ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
              <span>
                {t("selected_subject_count", {
                  count: selectedSubjectCardCount,
                  max: LIMITS.maxFlashcardsPerSubject,
                })}
              </span>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="px-0 py-0 lg:flex-1 lg:min-h-0">
          {flashcards.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center lg:h-full">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Layers3 className="size-6" />
              </div>
              <h2 className="text-lg font-semibold">{t("empty_title")}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {t("empty_description")}
              </p>
            </div>
          ) : (
            <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              {filteredFlashcards.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
                  {t("no_results")}
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 lg:hidden">
                    {paginatedFlashcards.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/subjects/${item.subjectId}/flashcards/${item.id}`}
                              className="block rounded-md text-sm font-medium text-foreground/95 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                              {getRichTextExcerpt(item.front, 100)}
                            </Link>
                            <p className="mt-2 text-sm text-muted-foreground/85">
                              {getRichTextExcerpt(item.back, 140)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <FlashcardsTableRowActions
                              flashcard={item}
                              onUpdated={handleUpdate}
                              onDeleted={handleDelete}
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <SubjectText
                              value={item.subjectName}
                              mode="truncate"
                              className="block max-w-48"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/30 backdrop-blur-sm">
                        <TableRow className="border-border/50 bg-transparent hover:bg-transparent">
                          <TableHead className="h-11 w-[35%] px-4 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase sm:px-6">
                            {t("table_front")}
                          </TableHead>
                          <TableHead className="h-11 w-[30%] px-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
                            {t("table_back")}
                          </TableHead>
                          <TableHead className="h-11 px-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
                            {t("table_subject")}
                          </TableHead>
                          <TableHead className="h-11 w-22 px-4 text-right text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase sm:px-6">
                            {t("table_actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedFlashcards.map((item) => (
                          <TableRow
                            key={item.id}
                            className="group border-border/40 hover:bg-muted/20"
                          >
                            <TableCell className="max-w-0 px-4 py-3 sm:px-6">
                              <Link
                                href={`/subjects/${item.subjectId}/flashcards/${item.id}`}
                                className="block truncate rounded-md text-sm font-medium text-foreground/95 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                              >
                                {getRichTextExcerpt(item.front, 100)}
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-0 px-2 py-3 text-muted-foreground">
                              <p className="truncate text-sm text-muted-foreground/85">
                                {getRichTextExcerpt(item.back, 140)}
                              </p>
                            </TableCell>
                            <TableCell className="max-w-0 px-2 py-3">
                              <div className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                <SubjectText
                                  value={item.subjectName}
                                  mode="truncate"
                                  className="block max-w-40"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right sm:px-6">
                              <div className="flex justify-end">
                                <FlashcardsTableRowActions
                                  flashcard={item}
                                  onUpdated={handleUpdate}
                                  onDeleted={handleDelete}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              <div className="flex items-center justify-end gap-4 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={clampedPage <= 1}
                >
                  {t("prev")}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t("page", { current: clampedPage, total: totalPages })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={clampedPage >= totalPages}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
