"use client";

import { Layers3, Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { FlashcardsTableRowActions } from "@/components/flashcards/flashcards-table-row-actions";
import { ImportFlashcardsButton } from "@/components/flashcards/import-flashcards-button";
import { SubjectText } from "@/components/shared/subject-text";
import { Button } from "@/components/ui/button";
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
import { filterFlashcardList } from "@/features/flashcards/manager";
import { Link, useRouter } from "@/i18n/routing";
import { LIMITS } from "@/lib/config/limits";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import type {
  FlashcardEntity,
  FlashcardListEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

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
  const router = useRouter();
  const [flashcards, setFlashcards] = useState(initialFlashcards);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    initialSubjectId ?? allSubjectsValue,
  );

  const selectedSubject =
    selectedSubjectId === allSubjectsValue
      ? undefined
      : subjects.find((subject) => subject.id === selectedSubjectId);
  const selectedSubjectCardCount = selectedSubject
    ? flashcards.filter((card) => card.subjectId === selectedSubject.id).length
    : 0;
  const isAtSubjectLimit =
    selectedSubjectCardCount >= LIMITS.maxFlashcardsPerSubject;
  const filteredFlashcards = filterFlashcardList({
    flashcards,
    searchQuery,
    subjectId:
      selectedSubjectId === allSubjectsValue ? undefined : selectedSubjectId,
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredFlashcards.length / PAGE_SIZE),
  );
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * PAGE_SIZE;
  const paginatedFlashcards = filteredFlashcards.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );
  const selectedActionSubject =
    selectedSubjectId === allSubjectsValue ? undefined : selectedSubject;

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <Input
            id="flashcards-search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder={t("search_placeholder")}
            className="w-full sm:min-w-72"
          />
          <Select value={selectedSubjectId} onValueChange={updateSubject}>
            <SelectTrigger className="w-full sm:min-w-56">
              <SelectValue placeholder={t("subject_filter_placeholder")} />
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <ImportFlashcardsButton
            subjectId={selectedActionSubject?.id}
            subjects={subjects}
            onImported={() => {
              router.refresh();
            }}
          />
          <CreateFlashcardDialog
            subjectId={selectedActionSubject?.id}
            subjects={subjects}
            trigger={
              <Button
                size="sm"
                className="gap-1.5"
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("results_count", {
            filtered: filteredFlashcards.length,
            total: flashcards.length,
          })}
        </p>
        {selectedSubject ? (
          <p className="text-sm text-muted-foreground">
            {t("selected_subject_count", {
              count: selectedSubjectCardCount,
              max: LIMITS.maxFlashcardsPerSubject,
            })}
          </p>
        ) : null}
      </div>

      {selectedSubject && isAtSubjectLimit ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            {t("limit_message", { max: LIMITS.maxFlashcardsPerSubject })}
          </p>
        </div>
      ) : null}

      {flashcards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Layers3 className="size-6" />
          </div>
          <h2 className="text-lg font-semibold">{t("empty_title")}</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t("empty_description")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[35%]">{t("table_front")}</TableHead>
                <TableHead className="w-[30%]">{t("table_back")}</TableHead>
                <TableHead>{t("table_subject")}</TableHead>
                <TableHead className="w-22 text-right">
                  {t("table_actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFlashcards.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {t("no_results")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFlashcards.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-0">
                      <Link
                        href={`/subjects/${item.subjectId}/flashcards/${item.id}`}
                        className="block truncate rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {getRichTextExcerpt(item.front, 100)}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-0 text-muted-foreground">
                      <p className="truncate">
                        {getRichTextExcerpt(item.back, 140)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <button
                        type="button"
                        className="block w-full min-w-0 rounded-sm text-left text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                        onClick={() => updateSubject(item.subjectId)}
                      >
                        <SubjectText
                          value={item.subjectName}
                          mode="truncate"
                          className="block max-w-full"
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <FlashcardsTableRowActions
                          flashcard={item}
                          onUpdated={handleUpdate}
                          onDeleted={handleDelete}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
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
              variant="outline"
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
    </div>
  );
}
