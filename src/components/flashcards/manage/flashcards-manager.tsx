"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getFlashcardForManage } from "@/app/actions/flashcards";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyCreateFlashcardDialog as CreateFlashcardDialog } from "@/components/flashcards/dialogs/lazy-create-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { FlashcardsManagerTable } from "@/components/flashcards/manage/flashcards-manager-table";
import { FlashcardsManagerToolbar } from "@/components/flashcards/manage/flashcards-manager-toolbar";
import { FlashcardsValidationResults } from "@/components/flashcards/manage/flashcards-validation-results";
import { LazyBulkDeleteFlashcardsDialog as BulkDeleteFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-delete-flashcards-dialog";
import { LazyBulkMoveFlashcardsDialog as BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-move-flashcards-dialog";
import { LazyBulkResetFlashcardsDialog as BulkResetFlashcardsDialog } from "@/components/flashcards/manage/lazy-bulk-reset-flashcards-dialog";
import { useFlashcardsManagerController } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import { ValidateAgainDialog } from "@/components/flashcards/manage/validate-again-dialog";
import { ValidateFlashcardsDialog } from "@/components/flashcards/manage/validate-flashcards-dialog";
import { Card } from "@/components/ui/card";
import { LIMITS } from "@/lib/config/limits";
import { getFlashcardDetailHref } from "@/lib/navigation/detail-page-back-link";
import type {
  DeckEntity,
  FlashcardManagePage,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface FlashcardsManagerProps {
  initialPageData: FlashcardManagePage;
  subjects: SubjectEntity[];
  decks: DeckEntity[];
  initialSubjectId?: string;
  initialDeckId?: string;
}

export function FlashcardsManager({
  initialPageData,
  subjects,
  decks,
  initialSubjectId,
  initialDeckId,
}: Readonly<FlashcardsManagerProps>) {
  const warningTone = getStatusToneClasses("warning");
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const {
    bulkDeleteOpen,
    bulkMoveOpen,
    bulkResetOpen,
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
    selectedDeckId,
    selectedFlashcardIds,
    selectedSubjectCardCount,
    selectedSubjectId,
    setBulkDeleteOpen,
    setBulkMoveOpen,
    setBulkResetOpen,
    setCreateOpen,
    setDeleteTarget,
    setEditingFlashcardId,
    setPageIndex,
    setResetTarget,
    setSearchQuery,
    setSelectedFlashcardIds,
    setSelectedSubjectId,
    handleDeckChange,
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
    initialDeckId,
    subjects,
  });
  const hasSubjects = subjects.length > 0;
  const isManageScopeLoading =
    managePageQuery.isFetching && managePageQuery.isPlaceholderData;

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
          isLoading={isManageScopeLoading}
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
      <FlashcardsManagerToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        hasSubjects={hasSubjects}
        validationMode={validationMode}
        subjects={subjects}
        decks={decks}
        selectedSubjectId={selectedSubjectId}
        selectedDeckId={selectedDeckId}
        isManageScopeLoading={isManageScopeLoading}
        selectedFlashcardIds={selectedFlashcardIds}
        selectedSubjectCardCount={selectedSubjectCardCount}
        total={total}
        validationIssuesCount={validationIssues.length}
        isValidatingAgain={isValidatingAgain}
        onSubjectChange={setSelectedSubjectId}
        onDeckChange={handleDeckChange}
        onOpenValidateDialog={() => setValidateDialogOpen(true)}
        onOpenCreateDialog={() => setCreateOpen(true)}
        onOpenValidateAgainDialog={() => setValidateAgainDialogOpen(true)}
        onExitValidation={exitValidation}
        onOpenBulkMoveDialog={() => setBulkMoveOpen(true)}
        onOpenBulkDeleteDialog={() => setBulkDeleteOpen(true)}
        onOpenBulkResetDialog={() => setBulkResetOpen(true)}
        onClearSelection={() => setSelectedFlashcardIds([])}
      />
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
        deckId={selectedDeckId}
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
          onDeleted={(deletedId) => {
            setEditingFlashcardId(null);
            refreshManagePage();
            if (validationMode) {
              removeValidationFlashcard(deletedId);
              checkValidationEmpty();
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
      <BulkResetFlashcardsDialog
        ids={selectedFlashcardIds}
        open={bulkResetOpen}
        onOpenChange={setBulkResetOpen}
        onReset={(_ids) => {
          refreshManagePage();
          setBulkResetOpen(false);
        }}
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
