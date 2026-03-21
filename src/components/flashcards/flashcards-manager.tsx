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
import { useTransition } from "react";
import { DeleteFlashcardDialog } from "@/components/flashcards/delete-flashcard-dialog";
import { FlashcardsManagerTable } from "@/components/flashcards/flashcards-manager-table";
import { LazyBulkDeleteFlashcardsDialog as BulkDeleteFlashcardsDialog } from "@/components/flashcards/lazy-bulk-delete-flashcards-dialog";
import { LazyBulkMoveFlashcardsDialog as BulkMoveFlashcardsDialog } from "@/components/flashcards/lazy-bulk-move-flashcards-dialog";
import { LazyCreateFlashcardDialog as CreateFlashcardDialog } from "@/components/flashcards/lazy-create-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/reset-flashcard-dialog";
import { useFlashcardsManagerController } from "@/components/flashcards/use-flashcards-manager-controller";
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
import { getFlashcardDetailHref } from "@/features/navigation/detail-page-back-link";
import { useRouter } from "@/i18n/routing";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardManagePage,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface FlashcardsManagerProps {
  initialPageData: FlashcardManagePage;
  subjects: SubjectEntity[];
  initialSubjectId?: string;
}

export function FlashcardsManager({
  initialPageData,
  subjects,
  initialSubjectId,
}: Readonly<FlashcardsManagerProps>) {
  const t = useTranslations("FlashcardsManager");
  const warningTone = getStatusToneClasses("warning");
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const {
    bulkDeleteOpen,
    bulkMoveOpen,
    createOpen,
    deleteTarget,
    editingFlashcard,
    editingFlashcardId,
    flashcards,
    isAtSubjectLimit,
    managePageQuery,
    pageIndex,
    searchQuery,
    refreshManagePage,
    resetTarget,
    selectedFlashcardIds,
    selectedSubjectCardCount,
    selectedSubjectId,
    setBulkDeleteOpen,
    setBulkMoveOpen,
    setCreateOpen,
    setDeleteTarget,
    setEditingFlashcardId,
    setPageIndex,
    setResetTarget,
    setSearchQuery,
    setSelectedFlashcardIds,
    setSelectedSubjectId,
    total,
    pageSize,
  } = useFlashcardsManagerController({
    initialPageData,
    initialSubjectId,
    subjects,
  });
  const hasSubjects = subjects.length > 0;

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
                    onChange={(event) => setSearchQuery(event.target.value)}
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
                    setSelectedSubjectId(value === "all" ? undefined : value)
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
                        filtered: total,
                        total,
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
                  "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
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
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xs ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            {t("limit_message", { max: LIMITS.maxFlashcardsPerSubject })}
          </p>
        </div>
      ) : null}
      <Card className="overflow-hidden border-border/70 bg-card/85 py-0 shadow-none lg:min-h-0 lg:flex-1">
        <FlashcardsManagerTable
          flashcards={flashcards}
          total={total}
          selectedFlashcardIds={selectedFlashcardIds}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={managePageQuery.isFetching}
          onEditRequested={setEditingFlashcardId}
          onPageIndexChange={setPageIndex}
          onDeleteRequested={setDeleteTarget}
          onResetRequested={setResetTarget}
          onSelectedFlashcardIdsChange={setSelectedFlashcardIds}
          onRowClick={(row) =>
            startNavTransition(() =>
              router.push(
                getFlashcardDetailHref(row.subjectId, row.id, {
                  from: "flashcards-manage",
                  subjectId: selectedSubjectId,
                }),
              ),
            )
          }
        />
      </Card>
      <CreateFlashcardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshManagePage}
        subjectId={selectedSubjectId}
        subjects={subjects}
      />
      {editingFlashcardId !== null && editingFlashcard ? (
        <EditFlashcardDialog
          flashcard={editingFlashcard}
          subjects={subjects}
          open={editingFlashcardId !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingFlashcardId(null);
            }
          }}
          onUpdated={refreshManagePage}
        />
      ) : null}
      <BulkDeleteFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDeleted={(_ids) => {
          refreshManagePage();
          setBulkDeleteOpen(false);
        }}
      />
      <BulkMoveFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkMoveOpen}
        onOpenChange={setBulkMoveOpen}
        onMoved={(_ids, _subjectId) => {
          refreshManagePage();
          setBulkMoveOpen(false);
        }}
        subjects={subjects}
      />
      {deleteTarget && (
        <DeleteFlashcardDialog
          flashcardId={deleteTarget.id}
          flashcardFront={deleteTarget.front}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleted={() => {
            setDeleteTarget(null);
            refreshManagePage();
          }}
        />
      )}
      {resetTarget && (
        <ResetFlashcardDialog
          flashcardId={resetTarget.id}
          flashcardFront={resetTarget.front}
          open
          onOpenChange={(open) => {
            if (!open) setResetTarget(null);
          }}
          onReset={() => {
            setResetTarget(null);
            refreshManagePage();
          }}
        />
      )}
    </div>
  );
}
