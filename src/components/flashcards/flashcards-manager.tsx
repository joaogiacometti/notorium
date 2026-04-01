"use client";

import {
  ArrowRightLeft,
  Layers3,
  Lock,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getFlashcardForManage } from "@/app/actions/flashcards";
import { DeleteFlashcardDialog } from "@/components/flashcards/delete-flashcard-dialog";
import { FlashcardsManagerTable } from "@/components/flashcards/flashcards-manager-table";
import { FlashcardsValidationResults } from "@/components/flashcards/flashcards-validation-results";
import { LazyBulkDeleteFlashcardsDialog as BulkDeleteFlashcardsDialog } from "@/components/flashcards/lazy-bulk-delete-flashcards-dialog";
import { LazyBulkMoveFlashcardsDialog as BulkMoveFlashcardsDialog } from "@/components/flashcards/lazy-bulk-move-flashcards-dialog";
import { LazyCreateFlashcardDialog as CreateFlashcardDialog } from "@/components/flashcards/lazy-create-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/reset-flashcard-dialog";
import { useFlashcardsManagerController } from "@/components/flashcards/use-flashcards-manager-controller";
import { ValidateAgainDialog } from "@/components/flashcards/validate-again-dialog";
import { ValidateFlashcardsDialog } from "@/components/flashcards/validate-flashcards-dialog";
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
    validationMode,
    validationIssues,
    validationFlashcards,
    validateDialogOpen,
    setValidateDialogOpen,
    handleValidationStarted,
    validateAgainDialogOpen,
    setValidateAgainDialogOpen,
    handleConfirmValidateAgain,
    isValidatingAgain,
    exitValidation,
    removeValidationFlashcard,
    updateValidationFlashcard,
    checkValidationEmpty,
  } = useFlashcardsManagerController({
    initialPageData,
    initialSubjectId,
    subjects,
  });
  const hasSubjects = subjects.length > 0;

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
    validationIssues.length === 1
      ? "1 card with issues"
      : `${validationIssues.length} cards with issues`;

  const isActionBarVisible = validationMode || selectedFlashcardIds.length > 0;
  const actionBarVisibilityClasses = isActionBarVisible
    ? "visible opacity-100"
    : "pointer-events-none invisible opacity-0";

  const renderSubjectFilter = () => {
    if (validationMode) return null;

    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <Select
            value={selectedSubjectId ?? "all"}
            onValueChange={(value) =>
              setSelectedSubjectId(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background/80 px-3.5 shadow-xs">
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
      </div>
    );
  };

  const renderStatusBadges = () => {
    if (validationMode) {
      return (
        <Badge
          variant="destructive"
          className="rounded-full px-2.5 py-0.5 text-[11px]"
        >
          {validationIssuesCountText}
        </Badge>
      );
    }

    return (
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
        {selectedSubjectId && (
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
        )}
      </>
    );
  };

  const renderActionBar = () => {
    if (validationMode) {
      return (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setValidateAgainDialogOpen(true)}
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
            onClick={exitValidation}
            className="rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Exit Validation"
          >
            <X className="size-4" />
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setBulkMoveOpen(true)}
          className="rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Move"
        >
          <ArrowRightLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setBulkDeleteOpen(true)}
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
          onClick={() => setSelectedFlashcardIds([])}
          className="rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </Button>
      </>
    );
  };

  const renderMainContent = () => {
    if (validationMode) {
      return (
        <FlashcardsValidationResults
          issues={validationIssues}
          flashcards={validationFlashcards}
          onEdit={setEditingFlashcardId}
          onDelete={setDeleteTarget}
        />
      );
    }

    return (
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
    );
  };

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
                    placeholder="Search front, back, or subject..."
                    className="h-10 rounded-lg border-border/70 bg-background/80 pl-10 shadow-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setValidateDialogOpen(true)}
                  disabled={!hasSubjects}
                  variant="outline"
                  className="h-10 shrink-0 gap-2 rounded-lg px-3 shadow-sm sm:px-4"
                >
                  <Sparkles className="size-4" />
                  <span className="hidden sm:inline">Validate</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  disabled={!hasSubjects}
                  className="h-10 flex-1 gap-2 rounded-lg px-4 shadow-sm sm:flex-initial"
                >
                  <Plus className="size-4" />
                  New Flashcard
                </Button>
              </div>
            </div>
            {renderSubjectFilter()}
            <div className="flex flex-wrap items-center gap-2 sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:min-h-8 sm:min-w-[18rem]">
                {renderStatusBadges()}
              </div>
              <div
                className={cn(
                  "ml-auto flex min-h-8 items-center justify-end gap-2 sm:min-w-34",
                  actionBarVisibilityClasses,
                )}
              >
                {renderActionBar()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedSubjectId && isAtSubjectLimit && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-xs ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            {`You've reached the limit of ${LIMITS.maxFlashcardsPerSubject} flashcards per subject. Please delete existing ones to create more.`}
          </p>
        </div>
      )}
      {renderMainContent()}
      <CreateFlashcardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refreshManagePage}
        subjectId={selectedSubjectId}
        subjects={subjects}
      />
      {editingFlashcardId !== null && editingFlashcard && (
        <EditFlashcardDialog
          flashcard={editingFlashcard}
          subjects={subjects}
          open={editingFlashcardId !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditingFlashcardId(null);
            }
          }}
          onUpdated={async () => {
            refreshManagePage();
            if (validationMode && editingFlashcardId) {
              const result = await getFlashcardForManage({
                id: editingFlashcardId,
              });
              if (result && !("errorCode" in result)) {
                const existingCard = validationFlashcards.find(
                  (c) => c.id === editingFlashcardId,
                );
                updateValidationFlashcard({
                  id: result.flashcard.id,
                  front: result.flashcard.front,
                  subjectName: existingCard?.subjectName ?? "",
                  subjectId: result.flashcard.subjectId,
                });
              }
            }
          }}
        />
      )}
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
            if (validationMode) {
              removeValidationFlashcard(deleteTarget.id);
              checkValidationEmpty();
            }
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
      <ValidateFlashcardsDialog
        open={validateDialogOpen}
        onOpenChange={setValidateDialogOpen}
        onValidationStarted={handleValidationStarted}
        subjects={subjects}
        currentSubjectId={selectedSubjectId}
      />
      <ValidateAgainDialog
        open={validateAgainDialogOpen}
        onOpenChange={setValidateAgainDialogOpen}
        onConfirm={handleConfirmValidateAgain}
        isValidating={isValidatingAgain}
        count={validationIssues.length}
      />
    </div>
  );
}
